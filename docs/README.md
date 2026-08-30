# Workout Tracker — Cloud Migration Docs

A locally-hosted full-stack app (React SPA + Node/Express + SQLite) migrated to AWS with a
rigorous, defensible design process: system design, the 6 R's, AWS service selection,
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

## Operations

- **[OPERATIONS-RUNBOOK.md](./OPERATIONS-RUNBOOK.md)** — run and maintain the live app:
  Cognito user admin, troubleshooting, cost management, deploy/rollback, and the
  email-reliability + SSO/federation roadmap.
- **[DEPLOY-RUNBOOK.md](./DEPLOY-RUNBOOK.md)** — exact command-line steps to ship a code
  change to the live stack: DB migration, `cdk diff`/`deploy`, secret rotation, smoke test.

## One-line thesis

> Low, spiky, relational workload → **serverless refactor** (S3+CloudFront, Cognito,
> API Gateway→Lambda, Aurora Serverless v2 scaled to zero): ~10× cheaper at idle than
> containers, keeps the relational model, lowest ops burden — with a documented path
> to containers if the workload profile changes.
