# War Stories — what broke and how I fixed it

Real issues hit while building and deploying, each as **symptom → diagnosis → fix →
lesson**. These are your evidence-backed answers to "tell me about a time something went
wrong." Every one was diagnosed from actual error output / CloudWatch logs.

## 1. Free Plan blocked Aurora

- **Symptom:** first `cdk deploy` failed — `AWS::RDS::DBCluster CREATE_FAILED: "To use
  Aurora clusters with free plan accounts you need to set WithExpressConfiguration … or
  upgrade your account plan."` Stack rolled back cleanly.
- **Diagnosis:** the new 6-month AWS Free Plan restricts Aurora to a constrained "express"
  config or a paid plan.
- **Fix:** evaluated two options — (A) upgrade the account to pay-as-you-go and keep the
  validated Aurora/Data API design, or (B) re-architect to RDS Postgres + in-VPC Lambda +
  IAM auth. Chose **A** (low cost-sensitivity, least rework, keeps the elegant design).
- **Lesson:** account/billing constraints are part of architecture. Know them, and always
  have a "plan B" data-tier design ready to discuss.

## 2. Lambda crashed at cold start — "Dynamic require of util is not supported"

- **Symptom:** every route 500'd; CloudWatch showed an uncaught exception during INIT.
- **Diagnosis:** I bundled the Lambda as **ESM**, but `express` / `serverless-express` are
  **CommonJS** and call `require()` internally — esbuild's ESM output doesn't define
  `require`.
- **Fix:** added a bundling **banner** that recreates `require` via
  `createRequire(import.meta.url)`.
- **Lesson:** CJS/ESM interop is the classic Node-on-Lambda footgun; know the `createRequire`
  shim (or bundle to CJS).

## 3. DB routes 500'd — "operator does not exist: integer = text"

- **Symptom:** `/exercises` and `/workouts` returned `{"error":"Internal error"}`; logs
  showed a Postgres type error at a `WHERE id = :id`.
- **Diagnosis:** Express **route params are strings** (`"5"`), and the Data API sent them as
  text. SQLite silently coerces; **PostgreSQL is strict** and won't compare `integer = text`.
- **Fix:** coerced all id params with `Number()` before querying.
- **Lesson:** test against the **real** database engine — Postgres' strictness surfaces bugs
  SQLite hides. "Works locally" isn't "works in prod."

## 4. First request after idle 500'd — `DatabaseResumingException`

- **Symptom:** the app worked, then after a few idle minutes the next click failed.
- **Diagnosis:** Aurora Serverless v2 is set to **scale to zero**; the first query triggers a
  resume (~15s) and the Data API throws `DatabaseResumingException` meanwhile.
- **Fix:** added **retry-with-backoff** in the query helper, kept under the API Gateway 30s
  timeout, so the first request transparently waits out the resume.
- **Lesson:** scale-to-zero trades idle cost for cold-start latency — handle it gracefully;
  the lever for zero cold starts is raising min capacity above 0 (at a cost).

## 5. No Cognito verification email

- **Symptom:** new sign-ups never received the 6-digit code.
- **Diagnosis:** Cognito's **default** email sender is rate-limited and frequently spam-
  filtered — fine for a demo, not production.
- **Fix:** confirmed the user from the CLI (`admin-confirm-sign-up` + set `email_verified`);
  documented the production fix (**Amazon SES** with a verified domain, out of the sandbox).
- **Lesson:** managed-service **defaults are not production-grade** — know which knobs to turn
  for reliability.

## 6. Tooling drift — cdk-nag v3 and the CDK version bump

- **Symptom:** `npm install` failed on a peer-dep conflict; then `NagSuppressions` import
  errored (`has no exported member`).
- **Diagnosis:** cdk-nag **v3 restructured its exports** (dropped the `NagSuppressions`
  helper) and needs a newer `aws-cdk-lib`; separately, the AWS CDK **CLI versioning had
  decoupled** (2.1128.x) from the library (2.260.x).
- **Fix:** pinned `aws-cdk-lib` 2.260, CLI 2.1128, and **cdk-nag ~2.38.2** (the v2 line keeps
  the stable API I used).
- **Lesson:** pin versions, read peer requirements, and **validate by running** — don't trust
  that "latest" is compatible.

## 7. DB init shattered a SQL statement

- **Symptom:** `db:init` errored with `syntax error at or near "BOOLEAN"`.
- **Diagnosis:** my script split the schema on `;`, but a **comment line** contained
  semicolons (`… AUTOINCREMENT; BOOLEAN …`), fracturing the first statement.
- **Fix:** strip `-- …` line comments before splitting.
- **Lesson:** naive SQL splitting is fragile; strip comments (or use a real parser / run
  statements individually).

## The meta-lesson (say this)

> "None of these were in the design doc — they showed up at deploy time. The valuable part
> wasn't avoiding them; it was reading the actual error output, forming a hypothesis, fixing
> the root cause, and writing down the trade-off. That's the loop I'd run on a customer
> engagement."
