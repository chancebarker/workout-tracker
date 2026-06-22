# Behavioral / STAR stories

ProServe is a **consulting** role, so expect behavioral questions alongside the technical
ones. These are STAR-format (Situation, Task, Action, Result) stories mined from this
project — adapt the wording to the question. Keep answers ~60–90 seconds spoken.

## 1. Managing ambiguity & scope (a customer's favorite trait)

- **S:** I started building an app with an ambitious "workout generator" feature set that
  kept growing (programs, 1RM math, even nutrition tracking).
- **T:** Decide what the product should actually be before sinking effort into the wrong
  thing.
- **A:** Stepped back, defined the core value ("one consistent home for a lifter's data"),
  and deliberately **cut scope** — dropped the generator and pushed back on nutrition
  tracking as a separate concern. Re-architected the data model around that focus.
- **R:** A focused, shippable tracker. The discipline of "do one thing well" made everything
  downstream (migration, deploy) tractable.
- **Consulting tie-in:** clarifying real requirements and saying "no" to scope creep is core
  to delivery.

## 2. A decision under a hard constraint

- **S:** I designed a serverless target (Aurora Serverless v2 + Data API) and validated it,
  then the first deploy failed — the AWS Free Plan blocks Aurora.
- **T:** Get to a working deployment without blowing up cost or the timeline.
- **A:** Framed two options with trade-offs — **upgrade the account** (keep the design, a few
  dollars) vs **re-architect** to RDS + in-VPC Lambda (stay free, more rework). Recommended
  the upgrade given low cost-sensitivity and the value of the validated design; kept the
  re-architecture documented as the fallback.
- **R:** Deployed within the hour, design intact, and I can articulate exactly when I'd have
  chosen the other path.
- **Consulting tie-in:** advising a customer is presenting options with trade-offs, then
  making a clear recommendation.

## 3. Debugging under pressure / ownership

- **S:** The app deployed but every data route returned 500s in the live environment.
- **T:** Root-cause and fix without local reproduction.
- **A:** Pulled **CloudWatch logs**, found a Postgres `integer = text` type error (route
  params are strings; Postgres is stricter than the SQLite I'd tested on), fixed the
  coercion; then hit a `DatabaseResumingException` from scale-to-zero and added a
  retry/backoff. Verified end-to-end with a real Cognito token before handing it back.
- **R:** Working multi-user app; two genuine bugs fixed with evidence, not guesswork.
- **Consulting tie-in:** calm, evidence-based troubleshooting in an unfamiliar/prod
  environment is the job.

## 4. Communicating trade-offs so others can trust the work

- **S:** My infra had intentional gaps for a demo (no WAF, MFA off, deletion protection off).
- **T:** Make those choices transparent rather than hidden.
- **A:** Wrote an **ADR** for the key decision, and documented every **cdk-nag suppression**
  with a justification and the production fix — so a reviewer sees conscious decisions, not
  unknowns. Added assertion tests so the decisions can't silently regress.
- **R:** Infra that a teammate (or customer) can review and trust.
- **Consulting tie-in:** documentation and defensibility build customer confidence.

## 5. Ramping fast on unfamiliar tech

- **S:** I hadn't used CDK, Cognito, or the RDS Data API before this.
- **T:** Deliver production-shaped infra anyway.
- **A:** Learned by building in small, verified increments — synth/test/nag after each
  construct — and handled real tooling drift (cdk-nag v3 dropped an API; the CDK CLI
  versioning had decoupled) by pinning compatible versions and **validating by running**.
- **R:** A deployed, tested, security-linted stack.
- **Consulting tie-in:** consultants constantly ramp on a customer's stack; the skill is a
  reliable learning loop, not pre-existing expertise.

## Quick-reference competency map

| If they ask about… | Use story |
|---|---|
| Ambiguity / prioritization / scope | #1 |
| Trade-offs / decision-making / advising | #2 |
| Conflict with reality / debugging / grit | #3 |
| Communication / documentation / trust | #4 |
| Learning agility / dealing with the unknown | #5 |
