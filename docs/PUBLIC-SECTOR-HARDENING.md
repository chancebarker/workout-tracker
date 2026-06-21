# Public-Sector Hardening Note (WWPS / Government)

> **Purpose.** How the Target A design changes when the customer is a regulated World Wide
> Public Sector / government entity. The commercial design is the baseline; this note is
> the delta a ProServe consultant would walk a public-sector customer through.

## 1. Account & region foundation

- **AWS GovCloud (US)** for workloads with ITAR / heightened compliance needs, or a
  dedicated commercial account under an **AWS Organization** with **Control Tower** for
  FedRAMP-aligned commercial workloads. Data residency is satisfied by pinning to US
  regions (e.g., GovCloud us-gov-west-1) and forbidding cross-region replication outside
  the authorization boundary.
- **Service Control Policies (SCPs)** at the org level: deny disabling CloudTrail, deny
  public S3, deny non-approved regions, deny resource creation without required tags,
  enforce IMDSv2, deny KMS key deletion without review.

## 2. Compliance posture

- **FedRAMP Moderate/High** (or **DoD Impact Levels IL2/IL4/IL5** in GovCloud) drive
  control selection. Use **only FedRAMP-authorized services** — verify each service in our
  design (S3, CloudFront, Cognito, API Gateway, Lambda, Aurora, KMS, Secrets Manager,
  CloudWatch, CloudTrail, WAF) against the relevant authorization for the target IL.
- Map controls to **NIST 800-53**; maintain an SSP (System Security Plan) and POA&M.

## 3. Network: private-only, no public ingress except the front door

- **No public-facing compute.** In the serverless design, compute is already non-public.
  Aurora sits in **isolated subnets** with **no internet route**.
- **Only ingress** is **CloudFront + AWS WAF** (managed rule groups: common, SQLi,
  known-bad inputs, rate limiting, optional geo-restriction). Origins locked to CloudFront
  via **OAC** and an origin-verification header.
- Where Lambda needs AWS-service access without internet egress, use **VPC interface
  endpoints (PrivateLink)** rather than NAT, so traffic never traverses the public
  internet — and document the (small) hourly endpoint cost as a security-for-cost trade.

## 4. Identity & access — stricter

- **IAM least privilege** everywhere, **permission boundaries** on all roles, **no long-
  lived users** — federate via the customer's IdP (e.g., **IAM Identity Center** / PIV/CAC
  smart-card auth). Enforce **MFA** (Cognito advanced security + WAF).
- Scope every policy to specific ARNs and conditions; no wildcards in production roles.

## 5. Encryption everywhere

- **Customer-managed KMS keys (CMKs)** with rotation for Aurora storage, S3, Secrets
  Manager, and CloudWatch Logs — not just AWS-managed keys, so the customer controls the
  key policy and can audit usage. **TLS 1.2+** enforced end to end (CloudFront viewer
  policy, API Gateway, Aurora in-transit).

## 6. Audit, logging, monitoring

- **CloudTrail** (org-wide, multi-region, log-file validation) to a locked, central
  logging account; **AWS Config** with conformance packs for continuous compliance;
  **GuardDuty**, **Security Hub** (FedRAMP/NIST standards), and **Access Analyzer** on.
- Centralized, immutable log retention (CloudWatch Logs + S3 with Object Lock) meeting the
  customer's retention mandate.

## 7. Data handling

- **Data residency:** pin all storage/replication to the authorized region(s); disable
  cross-region features that would move data outside the boundary.
- **Data classification & isolation:** tag data by sensitivity; consider per-tenant
  isolation if multi-agency.
- **Backups/DR:** automated Aurora backups + PITR within the boundary; documented RPO/RTO.

## Summary delta vs commercial baseline

| Area | Commercial baseline (Target A) | WWPS hardened |
|---|---|---|
| Region | us-east-1 | GovCloud (US) or Control Tower-governed commercial |
| Ingress | CloudFront + WAF | Same, + geo-restriction, origin verification, stricter WAF |
| Compute network | Lambda (no VPC for cost) | VPC + PrivateLink endpoints, no internet egress |
| Identity | Cognito | Cognito + IdP federation (PIV/CAC), enforced MFA, permission boundaries |
| Encryption | KMS (AWS-managed acceptable) | Customer-managed CMKs with rotation, TLS 1.2+ enforced |
| Audit | CloudWatch/X-Ray | + org CloudTrail, Config, GuardDuty, Security Hub, immutable logs |
| Guardrails | — | Org SCPs, Control Tower, mandatory tagging |
