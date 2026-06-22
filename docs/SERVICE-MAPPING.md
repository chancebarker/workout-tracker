# Local → AWS Service Mapping

How each part of the local stack maps to an AWS service, the alternatives we weighed, and
why we chose what we did. (Deeper rationale + costs live in
[ARCHITECTURE.md](./ARCHITECTURE.md); this is the quick "map" for talking through it.)

## The map at a glance

| Local component | Chosen AWS service | Main alternatives | Why this choice |
|---|---|---|---|
| React build (static files) | **S3 + CloudFront** | Amplify Hosting; EC2 + nginx | Static files need no server; S3+CloudFront is cheapest, global, and scales itself. CloudFront also fronts the API so the app is single-origin (no CORS). |
| Express API process | **Lambda + API Gateway (HTTP API)** | ECS Fargate + ALB; EC2; Elastic Beanstalk | Traffic is low/spiky → pay-per-request + scale-to-zero beats paying 24/7 for an ALB + always-on container. Kept the Express app via a Lambda adapter (minimal rewrite). |
| SQLite file | **Aurora Serverless v2 (PostgreSQL) + RDS Data API** | RDS for PostgreSQL; DynamoDB; Aurora provisioned | Keep the relational model (joins/aggregations the app relies on). Serverless v2 scales to zero for low idle cost. Data API = no VPC/connection management for the Lambda. |
| Hand-rolled JWT + bcrypt | **Amazon Cognito (user pool)** | Keep custom auth on Lambda; Auth0/Okta | Managed identity, MFA-capable, no custom crypto to maintain. API Gateway has a built-in Cognito JWT authorizer, so there's no auth code in the API. |
| Secrets in `.env` | **Secrets Manager** | SSM Parameter Store; env vars | DB credentials generated + stored encrypted, rotatable, never in code. (Parameter Store is the cheaper alternative for non-rotated config.) |
| `console.log` / local logs | **CloudWatch Logs + X-Ray** | Third-party (Datadog, etc.) | Native, no agents; X-Ray traces the request path. |
| "Run it on my machine" | **AWS CDK → CloudFormation** | Terraform; console click-ops | One language with the app (TypeScript), high-level constructs, testable, and `cdk destroy` tears it all down cleanly. |

## The three decisions worth defending

**1. Lambda vs. containers (Fargate).**
Chose Lambda because the workload is **low and spiky** — per-request pricing and scale-to-zero
win on idle cost. Fargate wins for **steady, high, predictable** load (a flat always-warm
cost beats per-request at scale) or when you need full runtime control. I can state the
trigger to switch: sustained high RPS.

**2. Aurora/PostgreSQL vs. DynamoDB.**
Kept **relational** because the app is join- and aggregation-heavy (progress over time,
"last time" lookups, cross-metric analysis). DynamoDB would force denormalization around
fixed access patterns — high remodeling cost for no benefit at this scale. Dynamo wins for
simple, fixed, extreme-scale key-value access — not this app.

**3. Aurora Serverless v2 vs. plain RDS.**
Serverless v2 **scales to zero** (cheap idle) and supports the **Data API**, which lets the
Lambda skip the VPC entirely (no NAT gateway). Plain RDS is free-tier eligible but always-on
and has no Data API — it would force the Lambda into the VPC with a `pg` driver. (Note: we
actually hit a Free Plan limit on Aurora and upgraded the account to keep this design — see
[OPERATIONS-RUNBOOK.md](./OPERATIONS-RUNBOOK.md) and the war-stories notes.)

## One-line spoken version

> "Static frontend to S3+CloudFront, the Express API to Lambda behind API Gateway, SQLite to
> Aurora Serverless v2 Postgres via the Data API, and custom auth to Cognito — each chosen
> for a low/spiky, relational workload optimizing for low idle cost, and I can name when I'd
> choose the alternative."
