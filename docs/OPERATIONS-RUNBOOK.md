# Operations & Admin Runbook

Practical maintenance for running the tracker for yourself, friends, and family. All admin
actions use the AWS CLI against the deployed stack.

> **Deployment values change on each fresh deploy.** After `cdk deploy`, read the real
> values from `infra/cdk-outputs.json`. Current reference (us-east-1):
> - User Pool ID: `us-east-1_JK6dgFOMn`
> - App Client ID: `1vkts23pk50b8q73baget03faf`
> - API Lambda log group: `/aws/lambda/WorkoutTrackerStack-ComputeApiFn...`
>
> The examples below use `$POOL` for the user pool id — set it first:
> `POOL=us-east-1_JK6dgFOMn` (bash) or `$POOL="us-east-1_JK6dgFOMn"` (PowerShell).

## User administration (Cognito)

**Why this matters:** Cognito's *default* email sender is rate-limited and often lands in
spam, so new users sometimes never see their verification code. As the admin you can fix
any of this from the CLI.

**Find / list users**
```
aws cognito-idp list-users --user-pool-id $POOL \
  --query "Users[].{user:Username,status:UserStatus,email:Attributes[?Name=='email']|[0].Value}" \
  --output table
```

**Confirm a user who didn't get the code** (skip the email entirely)
```
aws cognito-idp admin-confirm-sign-up --user-pool-id $POOL --username <username>
aws cognito-idp admin-update-user-attributes --user-pool-id $POOL --username <username> \
  --user-attributes Name=email_verified,Value=true
```
(`<username>` is the UUID from `list-users`, since email is an alias.)

**"Email already exists" when re-registering** — the account exists (often `UNCONFIRMED`).
Either **confirm** it (above) so they can log in, or **delete** it so they can re-register:
```
aws cognito-idp admin-delete-user --user-pool-id $POOL --username <username>
```

**Reset a password**
```
# Set a known permanent password (tell the user to change it after):
aws cognito-idp admin-set-user-password --user-pool-id $POOL --username <username> \
  --password '<NewPass123!>' --permanent

# Or trigger the self-service "forgot password" email flow:
aws cognito-idp admin-reset-user-password --user-pool-id $POOL --username <username>
```

**Disable / enable / delete**
```
aws cognito-idp admin-disable-user --user-pool-id $POOL --username <username>
aws cognito-idp admin-enable-user  --user-pool-id $POOL --username <username>
```

**Create an account for someone (no self-signup)**
```
aws cognito-idp admin-create-user --user-pool-id $POOL --username <email> \
  --message-action SUPPRESS \
  --user-attributes Name=email,Value=<email> Name=email_verified,Value=true
aws cognito-idp admin-set-user-password --user-pool-id $POOL --username <email> \
  --password '<TempPass123!>' --permanent
```

## Troubleshooting

**API returns `{"error":"Internal error"}` (HTTP 500).** Read the Lambda logs:
```
aws logs tail /aws/lambda/WorkoutTrackerStack-ComputeApiFn... --since 15m --format short
```
Common causes seen so far:
- `DatabaseResumingException` → Aurora was scaled to zero and is resuming. **Expected**; the
  app retries with backoff, so the first request after idle just takes ~5–15s. If you want
  zero cold starts, raise Aurora min capacity above 0 (see Cost).
- `operator does not exist: integer = text` → a query passed a string where an integer
  column was expected (coerce ids with `Number()`).
- `Dynamic require of "x" is not supported` → ESM Lambda bundling; the `createRequire`
  banner in `compute.ts` handles it.

**Inspect the database directly** (via the Data API — needs the cluster + secret ARNs from
outputs):
```
aws rds-data execute-statement --resource-arn <ClusterArn> --secret-arn <SecretArn> \
  --database workout --sql "SELECT count(*) FROM workouts" --format-records-as JSON
```

**Re-apply schema / re-seed exercises** (idempotent):
```
cd infra
CLUSTER_ARN=<...> SECRET_ARN=<...> DB_NAME=workout npm run db:init
```

**Frontend shows a blank page / 403s** → CloudFront cache. Invalidate after a redeploy
(`cdk deploy` does this automatically via the bucket deployment).

## Cost management

- **Set a budget alert** (Billing → Budgets) — a $10 monthly alert is plenty.
- **What bills while idle:** Aurora storage (~pennies) + KMS key (~$1/mo) + Secrets Manager
  (~$0.40/mo). Aurora *compute* is ~$0 at idle thanks to scale-to-zero. S3/CloudFront/
  Cognito/Lambda/API GW are effectively free at this scale.
- **Tear it down when not needed:** `cd infra && npx cdk destroy`. Redeploy any time with the
  flow in `infra/README.md`.
- **Trade-off lever:** for a smoother always-on experience (no cold start), set Aurora
  `serverlessV2MinCapacity` to `0.5` in `data.ts` — costs ~$40+/mo, so only for "real" use.

## Deploy / redeploy / rollback

- **Deploy:** `cd infra && npx cdk deploy`. First deploy provisions Aurora (~10–15 min).
- **App-only change (Lambda/SPA):** rebuild the SPA if needed (`cd client && npm run build`
  with the `VITE_COGNITO_*` env vars), then `cdk deploy` (~30s for code-only updates).
- **Rollback:** CloudFormation auto-rolls-back a failed deploy to the last good state. A
  stack stuck in `ROLLBACK_COMPLETE` (failed *first* create) must be deleted before
  redeploying: `aws cloudformation delete-stack --stack-name WorkoutTrackerStack`.

## Roadmap: email reliability & auth evolution (good interview discussion)

- **Reliable email:** move Cognito from its default sender to **Amazon SES** (verified
  domain, request production access out of the SES sandbox) for branded, deliverable
  verification/reset emails.
- **SSO / identity federation:** Cognito can **federate** to external identity providers —
  social (Google/Apple) via OIDC, or enterprise via **SAML/OIDC**. For an organization you'd
  layer **IAM Identity Center** for AWS access. Talking points: you'd swap the user pool's
  hosted sign-in for the IdP, map external claims to the app's `sub`, and migrate existing
  users via a **user-migration Lambda trigger** (bcrypt hashes can't be bulk-imported). This
  is the natural growth path from "personal app auth" to "enterprise SSO."
