# Interview Prep — Workout Tracker Cloud Migration (ProServe / WWPS)

> Crisp, defensible answers to the questions this design invites. Each answer leads with a
> one-line position, then the "why," then the trade-off (consultants always name the
> trade-off and the trigger to revisit).

## The 30-second story

> "I treated my locally-hosted full-stack workout tracker as a customer's *on-prem before*:
> React SPA, Node/Express API, SQLite. I assessed it against the **6 R's**, ruled out
> Retire/Retain/Repurchase, used Rehost as the baseline, and chose between **Replatform
> (ECS Fargate + RDS)** and **Refactor (serverless)**. Because the traffic is low and
> spiky and I'm optimizing for near-zero idle cost, I chose the **serverless refactor**:
> S3+CloudFront, Cognito, API Gateway→Lambda with my Express app wrapped, and **Aurora
> Serverless v2 scaled to zero** to keep the relational model. It's ~10× cheaper at idle
> than containers because there's no NAT, ALB, or always-on task. I built it in **CDK
> (TypeScript)** with least-privilege IAM, KMS, and Secrets Manager, and I can articulate
> exactly when I'd flip to containers and how I'd harden it for a government customer."

## Why CDK over Terraform / CloudFormation?

- **Position:** CDK (TypeScript) for an AWS-first shop that wants real programming-language
  abstractions; it synthesizes to CloudFormation, so I keep CFN's drift detection,
  rollback, and change sets.
- **Why:** loops/conditionals/types/unit tests, high-level constructs (L2/L3) that bake in
  sensible defaults and least-privilege, and one language across app and infra.
- **Trade-off:** Terraform wins for **multi-cloud** and a larger provider ecosystem; raw
  CloudFormation wins when you want zero abstraction or are constrained to YAML/JSON.
  For a single-cloud AWS customer (very common in WWPS), CDK is the sweet spot. If the
  customer already standardizes on Terraform, I'd meet them there — tooling serves the
  customer, not the other way around.

## Why Lambda over Fargate (and when the reverse)?

- **Position:** Lambda here because traffic is **low and spiky** and idle cost is the
  dominant concern — Lambda is pay-per-request and scales to zero.
- **When Fargate instead:** **steady, sustained, high-throughput** load (per-request
  pricing loses to always-warm containers), long-running/streaming work, large
  dependencies or >15-min execution, or a need for full runtime control / container
  parity with other environments.
- **Trade-off named:** Lambda's cost is cold starts; Fargate's cost is paying 24/7 for
  warmth. I picked the one whose downside (occasional cold start on a personal app) is
  acceptable and whose upside (zero idle) is exactly my goal.

## Why Fargate over EC2 (in the container target)?

- **Position:** Fargate removes the EC2 layer — no instance patching, right-sizing, or
  cluster capacity management; you pay per task vCPU/GB.
- **When EC2:** very high steady utilization where reserved/spot EC2 is cheaper per unit,
  GPU/special instances, or daemons needing host access. For a small bursty API, Fargate's
  lower ops burden wins.

## Why keep PostgreSQL instead of DynamoDB?

- **Position:** the data is relational and **join/aggregation-heavy** (progress over time,
  "last time" lookups, cross-metric analysis). Postgres fits; Aurora Serverless v2 keeps
  it managed and scale-to-zero.
- **Why not Dynamo:** it would force denormalization around fixed access patterns and
  break ad-hoc analytical queries — high remodeling cost for no benefit at this scale.
- **Trade-off / trigger:** if the access patterns became few, fixed, and extreme-scale
  key-value (millions of QPS, simple lookups), Dynamo's single-digit-ms at any scale would
  win. Not this workload.

## How do you handle secrets and IAM?

- **Secrets:** none in code or env files. DB credentials live in **Secrets Manager**
  (auto-generated, rotatable); the Lambda gets read access to that specific secret ARN.
- **IAM:** **least privilege** — each role scoped to specific actions on specific ARNs
  (e.g., Lambda may invoke the RDS **Data API** on this cluster and read this one secret,
  nothing more). **Permission boundaries** in stricter environments. No wildcard
  production policies.
- **Encryption:** KMS at rest (Aurora, S3, Secrets, logs), TLS 1.2+ in transit.

## How would you make this HA / multi-region?

- **HA (single region):** the serverless components are already multi-AZ by design
  (S3, CloudFront, API Gateway, Lambda, Cognito). Aurora: run it **Multi-AZ** (add a
  reader / failover target) instead of scale-to-zero single instance — that's the
  "upgrade for real" lever.
- **Multi-region:** CloudFront is already global; add **Aurora Global Database** (a
  secondary-region read replica with fast promotion), replicate Cognito via a secondary
  pool or a global identity strategy, deploy the API stack to region B, and use
  **Route 53** health-checked failover or latency routing. Name the cost: multi-region
  roughly doubles data-tier spend — justify it against the customer's RTO/RPO, don't
  default to it.

## How does cost scale with users?

- **At idle / personal scale:** ~$2–6/mo (Aurora scaled to zero is the only real driver).
- **As users grow:** cost rises with **requests** (API Gateway/Lambda, both cheap per
  unit) and **active database capacity** (Aurora ACUs scale up under load). The model is
  *spend follows usage* — the opposite of the container target, which pays a fixed
  ~$45–110/mo floor (NAT + ALB + task + RDS) before the first request.
- **Inflection point:** at sustained high, steady RPS the container target's flat cost can
  undercut per-request serverless — that's the documented trigger to reconsider Target B.

## How would you do a zero-downtime cutover?

- **Dual-run:** keep the source authoritative while the cloud stack runs in parallel. For
  a networked source DB, **DMS with CDC** keeps Aurora continuously current.
- **Cutover:** stop writes at the source, let CDC drain, verify row counts/checksums, then
  flip the entry point (DNS/CloudFront) to the cloud stack.
- **Rollback:** since the source is untouched during dual-run, rollback is repointing the
  entry point back to the source. Keep the source until a defined production soak passes,
  then decommission.
- **Honest caveat for *my* app:** my real source is SQLite of trivial size, so I'd use a
  one-shot `pgloader`/script during a short maintenance window rather than DMS/CDC — I use
  the heavier tooling when the customer's source justifies it. (Knowing *when not* to reach
  for a service is itself the consulting signal.)

## Curveballs to be ready for

- **"Your Lambda cold start hurts UX."** → True at p99 after idle; mitigations are
  provisioned concurrency and Aurora min-capacity > 0 — both off here *by choice* to
  protect idle cost on a demo. I'd turn them on for production and show the cost delta.
- **"Why CloudFront in front of the API, not just the SPA?"** → Single origin/domain →
  no CORS, edge TLS, WAF coverage for the API too, and one place to manage caching headers.
- **"How do you test infra?"** → CDK **assertions** (fine-grained template tests) +
  `cdk synth` in CI; optionally **snapshot tests** and **cdk-nag** for security rules.
- **"This is WWPS — what changes?"** → see
  [PUBLIC-SECTOR-HARDENING.md](./PUBLIC-SECTOR-HARDENING.md): GovCloud, FedRAMP/IL,
  private-only networking via PrivateLink, customer-managed KMS, org SCPs, CloudTrail/
  Config/GuardDuty/Security Hub, IdP federation with PIV/CAC.
- **"Defend SQLite in the original build."** → Right tool for a single-host learning app:
  zero-ops, embedded, fast. The migration is precisely about removing its
  single-host/availability limits — I picked it deliberately and I'm replacing it
  deliberately.
