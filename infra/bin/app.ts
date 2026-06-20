#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { AwsSolutionsChecks } from 'cdk-nag'
import { WorkoutTrackerStack } from '../lib/workout-tracker-stack'

const app = new cdk.App()

// Single region by design (see ARCHITECTURE.md §2.7). us-east-1: cheapest, every
// service available, most reference material. CloudFront fronts the SPA from the
// edge, so region choice barely affects user-perceived frontend latency.
new WorkoutTrackerStack(app, 'WorkoutTrackerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'Workout Tracker — Target A (serverless refactor). Demo config optimized for near-zero idle cost.',
  tags: {
    project: 'workout-tracker',
    target: 'A-serverless',
    environment: 'demo',
  },
})

// Security linting with cdk-nag (AWS Solutions ruleset). Opt-in via `-c nag=true`
// (npm run nag) so routine synth/deploy isn't blocked while iterating. Intentional
// demo trade-offs are documented as suppressions inside the stack.
if (app.node.tryGetContext('nag')) {
  cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))
}
