# Glossary — terms & acronyms

Fast recall for the interview. Grouped by area.

## Architecture / web

- **SPA (Single-Page Application):** one HTML page; JavaScript swaps content as you navigate
  (no full reloads). Our React app.
- **CORS (Cross-Origin Resource Sharing):** browser rule blocking calls to a different
  origin unless allowed. We avoid it by serving the API same-origin via CloudFront `/api/*`.
- **REST API:** HTTP endpoints (GET/POST/PATCH/DELETE) returning JSON.
- **JWT (JSON Web Token):** a signed token carrying claims (e.g., the user's `sub`). Cognito
  issues them; API Gateway validates them.
- **Origin (CloudFront):** the backend a distribution pulls from (our S3 bucket, and the API).

## AWS services

- **S3:** object storage; hosts the static React build.
- **CloudFront:** AWS CDN; serves the SPA from edge locations and proxies `/api`.
- **OAC (Origin Access Control):** lets CloudFront read a **private** S3 bucket (no public
  bucket).
- **API Gateway (HTTP API):** managed front door for the API; runs the Cognito JWT authorizer.
- **Lambda:** serverless functions; runs the Express API per request.
- **Cognito:** managed user directory (user pool) handling sign-up/in and issuing JWTs.
- **Aurora Serverless v2:** auto-scaling managed PostgreSQL; can scale to zero when idle.
- **ACU (Aurora Capacity Unit):** Aurora's unit of compute/memory; we set min 0 (scale to
  zero), max 1.
- **RDS Data API:** an HTTPS, IAM-authorized way to run SQL on Aurora — no DB connection or
  VPC needed by the caller.
- **RDS (Relational Database Service):** managed relational databases (the non-Aurora option
  we compared against).
- **DynamoDB:** AWS managed NoSQL key-value store (the alternative we rejected for this
  relational workload).
- **Secrets Manager:** stores/rotates secrets (our DB credentials).
- **KMS (Key Management Service):** managed encryption keys; encrypts Aurora storage, etc.
- **CloudWatch:** logs, metrics, alarms, dashboards.
- **X-Ray:** distributed tracing of a request across services.
- **WAF (Web Application Firewall):** filters malicious HTTP traffic (production add-on).
- **VPC / NAT Gateway:** private network / its paid internet-egress device. We **avoid** NAT
  by using the Data API (Lambda stays out of the VPC).
- **ALB (Application Load Balancer):** L7 load balancer (used in the container alternative).
- **ECS Fargate:** serverless containers (the Replatform alternative).

## IaC / delivery

- **IaC (Infrastructure as Code):** define infra in code. We use CDK.
- **CDK (Cloud Development Kit):** write AWS infra in TypeScript; compiles to CloudFormation.
- **CloudFormation:** AWS's native IaC engine; handles create/update/**rollback**.
- **cdk-nag:** security linter for CDK (AWS Solutions ruleset).
- **ADR (Architecture Decision Record):** a short doc capturing a key decision + rationale.
- **CI/CD:** automated build/test/deploy pipeline (e.g., GitHub Actions running tests + nag).

## Migration / Well-Architected

- **6 R's:** migration strategies — Rehost, Replatform, Refactor, Repurchase, Retain, Retire.
- **Well-Architected Framework:** AWS's 6 pillars — Operational Excellence, Security,
  Reliability, Performance Efficiency, Cost Optimization, Sustainability.
- **DMS (Database Migration Service):** moves data between databases (full-load + CDC).
- **CDC (Change Data Capture):** streams ongoing DB changes — enables near-zero-downtime
  cutover.
- **DataSync / MGN:** bulk file transfer / VM rehost services (named where they'd apply).

## Identity / public sector

- **MAU (Monthly Active Users):** Cognito's free-tier metric (50k free).
- **SSO / Federation:** sign in via an external IdP (Google, SAML/OIDC, enterprise).
- **IAM (Identity and Access Management):** AWS permissions; we scope roles least-privilege.
- **IAM Identity Center:** AWS SSO for org/account access.
- **SCP (Service Control Policy):** org-level guardrail restricting what accounts can do.
- **FedRAMP / IL (Impact Level):** US government compliance programs / DoD data sensitivity
  tiers — drive the WWPS hardening design.
- **GovCloud:** isolated AWS regions for US government / regulated workloads.
