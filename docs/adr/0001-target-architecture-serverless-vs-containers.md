# ADR-0001: Target architecture — Serverless (Refactor) over Containers (Replatform)

- **Status:** Proposed (awaiting review)
- **Date:** 2026-06-20
- **Deciders:** App owner (migration lead) + acting AWS Solutions Architect
- **Context tags:** migration, 6 R's, cost optimization, Well-Architected

## Context

The Workout Tracker runs today on a single local host: a React SPA, a Node.js/Express
REST API, and an embedded SQLite database. We are migrating it to AWS as a
portfolio/discussion artifact that must be **defensible like consulting advice to a
customer**, not merely functional.

The workload has three defining characteristics:

1. **Traffic is low and spiky** (personal-app scale, maybe a few users later). Idle cost,
   not cost-at-scale, is the dominant economic concern.
2. **Data is relational and join-heavy** (users → workouts → workout_exercises → sets;
   plus daily_metrics). Progress charts, "last time" lookups, and future cross-metric
   analysis all depend on ad-hoc SQL aggregation.
3. **The build optimizes for near-zero idle cost** — deploy to demo, then `cdk destroy`.

Rehost (single EC2) is the honest baseline but inherits every weakness of the current
single host and shows the least cloud-native value. The real decision is **Replatform
(containers) vs Refactor (serverless)**.

## Decision

**Adopt Target A — Serverless (Refactor):**

- **Frontend:** S3 (private) + CloudFront (OAC, ACM/TLS, WAF)
- **Auth:** Amazon Cognito User Pool (replaces hand-rolled JWT/bcrypt)
- **API:** existing Express app on **AWS Lambda** via `@codegenie/serverless-express`,
  fronted by **API Gateway HTTP API** with a Cognito JWT authorizer
- **Data:** **Aurora Serverless v2 (PostgreSQL)** — preserves the relational schema, with
  **minimum capacity 0 ACU (scale-to-zero)** for the demo configuration
- **Cross-cutting:** least-privilege IAM, KMS encryption at rest, TLS in transit, Secrets
  Manager for DB credentials, CloudWatch + X-Ray for observability

Target B (ECS Fargate + ALB + RDS + VPC/NAT) will be **stubbed and documented** in the
CDK project so the trade-off is demonstrable.

## Rationale

- **Idle cost (Cost Optimization / Sustainability):** ~$2–6/mo (Aurora scaled to zero) vs
  ~$45–110/mo for containers, where NAT Gateway (~$32/mo) + ALB (~$16+/mo) + an always-on
  task + RDS bill 24/7. ~10× cheaper at idle — the decisive factor for this workload.
- **Operational burden (Operational Excellence):** no servers, OS, or container images to
  patch; AWS manages scaling and availability.
- **Data-model fit:** Aurora keeps PostgreSQL, so the schema and join-based features port
  directly. **DynamoDB was considered and rejected** — it would force denormalization
  around fixed access patterns and break the ad-hoc aggregation the progress features need.
- **Security:** no public-facing compute; Cognito replaces custom auth; smaller attack
  surface.
- **Portfolio signal:** the strongest cloud-native narrative for a ProServe discussion,
  while still being able to articulate when containers win.

## Consequences

**Positive**
- Lowest possible idle spend; trivially destroyable/redeployable for demos.
- Minimal code change to the API (wrap, don't rewrite).
- Managed identity, backups, patching, and tracing out of the box.

**Negative / trade-offs (and mitigations)**
- **Cold starts:** Lambda ~0.1–0.8s; Aurora resume ~5–15s from zero. *Mitigation for
  "real":* set Aurora min capacity to 0.5–1 ACU and/or add provisioned concurrency —
  explicitly **off** for the demo to protect idle cost.
- **Refactor effort:** Lambda adapter + API Gateway authorizer + Cognito user migration.
  *Mitigation:* keep the Express app intact behind the adapter; migrate users via a
  Cognito migration-trigger Lambda on first sign-in (bcrypt hashes can't be bulk-imported).
- **Per-request pricing** could exceed containers at sustained high RPS. *Trigger to
  revisit:* if traffic becomes steady and high, re-evaluate Target B (this ADR would be
  superseded).

## Alternatives considered

- **Rehost (EC2 single host):** rejected — inherits single-host weaknesses, ~24/7 cost,
  least cloud-native value. Useful only as the comparison baseline.
- **Replatform (Target B):** viable and lower migration risk, but loses on idle cost and
  ops burden for this workload. Retained as the documented stub and the "when containers
  win" counterpoint.
- **Refactor onto DynamoDB:** rejected — high remodeling cost and poor fit for join-heavy,
  ad-hoc analytical access patterns.
