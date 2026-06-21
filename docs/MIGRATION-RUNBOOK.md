# Migration Runbook — Workout Tracker → AWS (Target A, Serverless)

> **Scope.** How to move the data and cut over from the single local host to the
> serverless target with **minimal risk and a clean rollback**. Phased per the AWS
> migration model: **Assess → Mobilize → Migrate/Modernize → Validate → Cutover**.

> **Honesty note on tooling.** Our *real* source is an **embedded SQLite file**, so the
> "right tool" differs from the textbook on-prem case. Where a customer's source is a
> networked RDBMS (e.g., on-prem PostgreSQL/Oracle/SQL Server), **AWS DMS** is the correct
> service. For our embedded SQLite of trivial size, a **one-shot `pgloader` (or a small
> export/transform/load script)** is simpler and lower-risk. Both paths are documented so
> the decision is defensible either way.

## Service selection for migration mechanics

| Need | Customer/on-prem scenario | Our actual case |
|---|---|---|
| Relational data move | **AWS DMS** (CDC for near-zero-downtime, source = networked DB) | `pgloader` / one-shot script (source = local SQLite file) |
| Bulk file/asset move | **AWS DataSync** (NFS/SMB/S3 over the wire) | **N/A** — no binary assets today |
| Lift a whole VM | **AWS MGN** (Application Migration Service, block-level rehost) | **N/A** — we refactor, we don't rehost a VM |
| Secrets/config | Secrets Manager + SSM Parameter Store | Same |

## Phase 1 — Assess

- Inventory the app (done in [ARCHITECTURE.md](./ARCHITECTURE.md)): React SPA, Express
  API, SQLite, custom JWT auth. No file assets. Tiny data volume.
- Confirm the target ([ADR-0001](./adr/0001-target-architecture-serverless-vs-containers.md)):
  S3+CloudFront, Cognito, API Gateway→Lambda, Aurora Serverless v2 (Postgres).
- Identify the two refactor seams that carry the most risk:
  1. **Data layer:** SQLite (`better-sqlite3`, synchronous) → PostgreSQL (`pg` or the RDS
     Data API, async). SQL dialect deltas: `AUTOINCREMENT` → `GENERATED … AS IDENTITY`,
     `INTEGER` boolean flags → `BOOLEAN`, `DATETIME DEFAULT CURRENT_TIMESTAMP` →
     `timestamptz DEFAULT now()`, `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`.
  2. **Auth:** hand-rolled JWT → Cognito. Existing bcrypt hashes **cannot** be bulk-loaded
     into Cognito; use a **User Migration Lambda trigger** that validates the old hash on
     first sign-in and transparently re-enrolls the user.

## Phase 2 — Mobilize

- Stand up the landing zone with CDK (`cdk bootstrap`, then deploy the data/auth stacks
  first).
- Author the **Postgres schema** as a migration script (the SQLite DDL ported to Postgres).
  Keep it in source control (`infra/db/schema.sql`).
- Build the **data ETL**:
  - *Simple path:* `pgloader sqlite://workout.db postgresql://…/workout` (handles type
    mapping), **or** a ~40-line Node script: read each table with `better-sqlite3`, insert
    into Postgres with `pg`, preserving IDs and FK order
    (users → exercises → workouts → workout_exercises → sets → daily_metrics).
  - *Customer/CDC path:* DMS replication instance + source/target endpoints + a task with
    **full-load + CDC** for ongoing changes during dual-run.
- Wire observability (CloudWatch dashboards/alarms) before any traffic.

## Phase 3 — Migrate / Modernize

- Apply `schema.sql` to Aurora.
- Run the ETL (full load). For a customer DB, start **CDC** so the target stays current
  while the source still serves traffic (this is what enables near-zero-downtime).
- Deploy the **API on Lambda** (Express via `@codegenie/serverless-express`) pointing at
  Aurora; deploy the **SPA to S3/CloudFront** with the API base URL configured to the
  CloudFront `/api/*` behavior (same-origin, no CORS).
- Configure Cognito (user pool, app client, hosted UI or app-driven flows) and the API
  Gateway **JWT authorizer**.

## Phase 4 — Validate

- **Row counts & checksums** per table: source vs Aurora must match.
- **Functional smoke test** against the cloud stack: register/login (Cognito), create
  workout, add exercise, log sets w/ RPE, "last time" reference, metrics upsert,
  progress/PR endpoints.
- **Auth migration test:** an existing user signs in once → migration trigger re-enrolls
  them in Cognito; subsequent logins are native Cognito.
- **Non-functional:** cold-start timing (Lambda + Aurora resume from zero), p95 latency,
  CloudWatch errors/throttles, X-Ray traces clean.

## Phase 5 — Cutover (with dual-run & rollback)

- **Dual-run window:** keep the local app authoritative while the cloud stack runs in
  parallel (read-only validation, or CDC keeping Aurora current for a customer DB).
- **Cutover:** flip the DNS/entry point to CloudFront. For a customer with CDC, stop
  writes at the source, let CDC drain the final changes, verify counts, then switch.
- **Rollback plan:** because cutover is a DNS/endpoint switch and the source is untouched
  during dual-run, rollback is **point the entry point back at the source**. Keep the
  source intact until validation has passed in production for an agreed soak period, then
  decommission.

## Cutover checklist (condensed)

- [ ] Aurora schema applied; ETL row counts/checksums match
- [ ] Cognito pool + app client live; migration trigger tested
- [ ] API on Lambda healthy; X-Ray + CloudWatch clean
- [ ] SPA on CloudFront; `/api/*` behavior reaches the HTTP API; TLS valid
- [ ] WAF attached; Secrets Manager wired; no hardcoded secrets
- [ ] Smoke tests green against the cloud stack
- [ ] DNS/entry-point switched; soak period defined; rollback path confirmed
- [ ] Source retained until soak passes, then decommissioned
