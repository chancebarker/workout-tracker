# Technology Overview

A one-liner on each technology in the stack — what it is and why it's here. (AWS service
choices are covered in [SERVICE-MAPPING.md](./SERVICE-MAPPING.md).)

## Frontend (the React SPA)

| Tech | What it is | Why we used it |
|---|---|---|
| **React** | A JavaScript library for building UIs from reusable components | Industry-standard SPA framework; component model fits a workout/calendar UI |
| **Vite** | A frontend build tool + dev server | Fast hot-reload in dev; produces optimized static files for production |
| **React Router** | Client-side routing for React | Navigate between Calendar/Workout/Metrics/Progress without full page reloads |
| **Tailwind CSS** | Utility-class CSS framework | Build a clean, consistent dark UI quickly without hand-writing CSS |
| **Recharts** | Charting library for React | Progress and metric trend graphs |
| **react-calendar** | A calendar component | The calendar home view |
| **amazon-cognito-identity-js** | AWS SDK for Cognito user pools in the browser | Sign-up / confirm / sign-in and getting the JWT to call the API |

## Backend — the local "before" (on-prem analog)

| Tech | What it is | Why we used it |
|---|---|---|
| **Node.js** | JavaScript runtime for running code outside the browser | Run a server in JS; same language as the frontend |
| **Express** | Minimal web framework for Node | Defines the REST API routes and middleware |
| **SQLite** (`better-sqlite3`) | A file-based relational database | Zero-ops local DB; perfect for a single-host app |
| **Zod** | Schema validation library | Validate request bodies at the API boundary |
| **jsonwebtoken + bcrypt** | JWT signing + password hashing | The original hand-rolled auth (later replaced by Cognito) |

## Cloud — the "after" (runs the deployed app)

The Express API runs on **AWS Lambda** (via `@codegenie/serverless-express`) talking to
**Aurora Serverless v2 (PostgreSQL)** through the **RDS Data API**; auth is **Amazon
Cognito**. Full service mapping and alternatives are in
[SERVICE-MAPPING.md](./SERVICE-MAPPING.md).

## Infrastructure & tooling

| Tech | What it is | Why we used it |
|---|---|---|
| **AWS CDK (TypeScript)** | Infrastructure-as-Code — define AWS resources in real code | Reproducible, reviewable, destroyable infra; synthesizes to CloudFormation |
| **CloudFormation** | AWS's native IaC engine (CDK compiles to it) | Handles create/update/rollback of the stack |
| **Jest + cdk-nag** | Unit-test runner + AWS security linter for CDK | Assertion tests on the synthesized template; security best-practice checks |
| **esbuild** | JavaScript bundler | CDK uses it to bundle the Lambda code |
| **Git / GitHub (+ gh CLI)** | Version control + PR workflow | History, branches, pull requests |
| **AWS CLI** | Command-line access to AWS | Credentials, deploys, admin tasks (see [OPERATIONS-RUNBOOK.md](./OPERATIONS-RUNBOOK.md)) |

## The 30-second spoken version

> "It's a React single-page app talking to a Node/Express REST API over a relational
> database. Locally that's SQLite; in the cloud the same Express app runs on Lambda
> against Aurora Serverless v2 Postgres, with Cognito for auth. Everything in AWS is
> defined in CDK with TypeScript, unit-tested and security-linted with cdk-nag."
