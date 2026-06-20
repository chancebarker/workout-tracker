# Workout Tracker — Cloud Migration Portfolio

A locally-hosted full-stack app (React SPA + Node/Express + SQLite) migrated to AWS as a
defensible, consultant-style case study: system design, the 6 R's, AWS service selection,
and Infrastructure-as-Code with AWS CDK (TypeScript).

## Read in this order

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — current-state assessment, the 6 R's, two
   target architectures (serverless vs containers), trade-off matrix, costs, and
   Well-Architected mapping. Before/after Mermaid diagrams.
2. **[adr/0001-…](./adr/0001-target-architecture-serverless-vs-containers.md)** — the
   decision record: why Target A (serverless refactor).
3. **[MIGRATION-RUNBOOK.md](./MIGRATION-RUNBOOK.md)** — phased data migration + cutover,
   with dual-run/rollback (DMS / DataSync / MGN where they apply).
4. **[../infra/](../infra/)** — the CDK project. Target A fully built; Target B stubbed.
5. **[PUBLIC-SECTOR-HARDENING.md](./PUBLIC-SECTOR-HARDENING.md)** — how the design changes
   for a regulated WWPS/government customer.
6. **[INTERVIEW-PREP.md](./INTERVIEW-PREP.md)** — crisp, defensible answers to the
   questions this design invites.

## One-line thesis

> Low, spiky, relational workload → **serverless refactor** (S3+CloudFront, Cognito,
> API Gateway→Lambda, Aurora Serverless v2 scaled to zero): ~10× cheaper at idle than
> containers, keeps the relational model, lowest ops burden — and I can defend exactly
> when I'd choose containers instead.
