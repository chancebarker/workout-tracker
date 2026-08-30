# Deploy Runbook

Exact command-line steps to ship a code/schema change from local dev to the live stack.
Written to be run by hand from a terminal — not a CI pipeline (there isn't one yet).

## Prerequisites

- AWS credentials configured (`aws configure` / SSO) with access to the target account.
- Node.js 20+, `npm`.
- The stack is already deployed once (`cd infra && npx cdk bootstrap && npx cdk deploy`
  — see [`../infra/README.md`](../infra/README.md) for a first-time deploy). This runbook
  covers *updating* an already-live stack, not bootstrapping a new one.

## Step 0 — point the AWS CLI at working credentials

Normally just `aws configure` once. If your credentials live somewhere non-standard
(e.g. a Windows-side install reachable from WSL), point the CLI at them explicitly:

```bash
export AWS_SHARED_CREDENTIALS_FILE=/path/to/credentials
export AWS_CONFIG_FILE=/path/to/config
AWS=aws   # or a full path to the aws binary if it's not on PATH
```

## Step 1 — pull the live stack's outputs into env vars

Never hand-copy ARNs/IDs — they're account- and deploy-specific. Fetch them fresh every
time:

```bash
STACK=WorkoutTrackerStack
outputs() { $AWS cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }

export CLUSTER_ARN=$(outputs ClusterArn)
export SECRET_ARN=$(outputs SecretArn)
export DB_NAME=$(outputs DbName)
USER_POOL_ID=$(outputs UserPoolId)
USER_POOL_CLIENT_ID=$(outputs UserPoolClientId)
```

**Gotcha if your AWS CLI runs as a Windows binary from WSL** (e.g. reached via
`/mnt/c/...`): its output uses Windows line endings, so `--output text` silently
appends a trailing `\r` to captured values. That `\r` doesn't show up when you `echo`
the variable, but it corrupts ARNs enough that the RDS Data API rejects even a bare
`SELECT 1` with an unhelpful `DatabaseErrorException: Database returned SQL Exception` —
no mention of the real cause. Fix: pipe every captured output through `tr -d '\r'`:
```bash
outputs() { $AWS cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text | tr -d '\r'; }
```
If a `describe-*` call ever fails with `Input can't contain control characters`, this is
almost certainly why — check `cat -A` on the captured variable.

## Step 2 — apply any DB schema/content migration first

Run this **before** deploying new Lambda code that depends on the new columns/data, so
the schema is ready by the time the new code goes live:

```bash
cd infra
node scripts/db-init.mjs
```

`db-init.mjs` applies `lambda/api/schema.sql` (idempotent — `CREATE TABLE IF NOT EXISTS`,
`ADD COLUMN IF NOT EXISTS`) and backfills any exercise content that predates a given
column, using `lambda/api/seed-exercises.mjs` as the source of truth. Safe to re-run.

## Step 3 — install any new Lambda dependencies

If `infra/lambda/api/package.json` changed:

```bash
cd infra/lambda/api
npm install
cd ../..
```

`NodejsFunction` bundles the Lambda with esbuild from whatever's in `node_modules` here —
skipping this step means the bundle silently uses stale dependencies.

## Step 4 — review the changeset before touching anything live

```bash
cd infra
npx cdk diff WorkoutTrackerStack
```

Read the output. Look specifically for anything marked "may be replaced" — that's your
cue to check *why* before deploying (e.g. an unintended frontend rebuild picking up
in-progress work sitting in `client/dist`).

## Step 5 — rebuild the frontend against the live Cognito pool

Using the IDs pulled in Step 1, not typed by hand:

```bash
cd client
VITE_COGNITO_USER_POOL_ID=$USER_POOL_ID \
VITE_COGNITO_CLIENT_ID=$USER_POOL_CLIENT_ID \
VITE_API_BASE=/api \
npm run build
cd ../infra
```

The `Frontend` construct's `BucketDeployment` picks up whatever is in `client/dist` at
synth time — this step is what makes sure that's a real, Cognito-pointed production
build, not a local-dev build left over from testing.

## Step 6 — deploy

The one command that actually changes the live stack:

```bash
npx cdk deploy WorkoutTrackerStack
```

## Step 7 — populate any new secrets

A newly-created `secretsmanager.Secret` deploys with a random placeholder value. Set the
real one:

```bash
$AWS secretsmanager put-secret-value \
  --secret-id <secret-name> \
  --secret-string "<real-value>"
```

## Step 8 — smoke test

Open the `SiteUrl` output in a browser. Log in. Click through whatever the change
touched. Don't consider a deploy done until you've actually used the feature against the
live stack, not just watched `cdk deploy` finish cleanly.

## Rollback

`cdk deploy` on a prior commit re-synthesizes and diffs against the *current* live
state, so rolling back Lambda/infra code is `git checkout <prior-commit> -- infra` then
repeat Steps 3–6. There's no automatic rollback of the DB migration step — schema
changes here are additive by convention (`ADD COLUMN IF NOT EXISTS`), so they're safe to
leave in place even if the code that used them gets rolled back.
