import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { NagSuppressions } from 'cdk-nag'
import { Network } from './constructs/network'
import { Data } from './constructs/data'
import { Auth } from './constructs/auth'
import { Compute } from './constructs/compute'
import { Frontend } from './constructs/frontend'
import { Observability } from './constructs/observability'
import { BudgetAlarm } from './constructs/budget'

/**
 * Target A — Serverless (Refactor).
 *
 * Composed from six logical constructs so each piece can be explained in isolation:
 *   network        — minimal VPC for Aurora (isolated subnets, NO NAT → no idle cost)
 *   data           — Aurora Serverless v2 (Postgres), Data API on, scale-to-zero, KMS
 *   auth           — Cognito user pool + app client (replaces hand-rolled JWT)
 *   compute        — Lambda (Express via serverless-express) behind API Gateway HTTP API
 *   frontend       — S3 (private) + CloudFront (OAC); /api/* routed to the HTTP API
 *   observability  — X-Ray on the function + CloudWatch dashboard/alarms
 *
 * Cross-cutting: least-privilege IAM (grants are scoped in each construct), KMS at rest,
 * TLS in transit, Secrets Manager for DB credentials. No secret is ever hardcoded.
 */
export class WorkoutTrackerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // 1) Network — a small VPC purely so Aurora has somewhere to live. We use only
    //    PRIVATE_ISOLATED subnets and zero NAT gateways; the Data API reaches the
    //    cluster over the AWS service layer, so Lambda never needs to be in the VPC.
    const network = new Network(this, 'Network')

    // 2) Data — the relational store. Aurora Serverless v2 keeps our Postgres schema
    //    and (in demo config) scales to zero ACUs when idle.
    const data = new Data(this, 'Data', { vpc: network.vpc })

    // 3) Auth — Cognito issues the JWTs that the HTTP API validates.
    const auth = new Auth(this, 'Auth')

    // 4) Compute — the Express API on Lambda, fronted by an HTTP API whose default
    //    authorizer is the Cognito user pool. The function gets least-privilege grants
    //    to call the Data API on this cluster and read this one secret.
    const compute = new Compute(this, 'Compute', {
      cluster: data.cluster,
      dbSecret: data.secret,
      databaseName: data.databaseName,
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
    })

    // 5) Frontend — the React build on S3, served via CloudFront. CloudFront also
    //    proxies /api/* to the HTTP API so the SPA is single-origin (no CORS).
    const frontend = new Frontend(this, 'Frontend', {
      apiDomain: compute.apiDomain,
    })

    // 6) Observability — tracing + a starter dashboard/alarm for the function.
    new Observability(this, 'Observability', { fn: compute.fn })

    // 7) Budget — account-wide monthly cost alert (separate from the Anthropic API's own
    //    console spend cap, which only covers the photo-scan feature's API usage).
    new BudgetAlarm(this, 'Budget', {
      notificationEmail: 'chance.r.barker+workout-app@gmail.com',
      monthlyLimitUsd: 20,
    })

    // ---- Outputs you'll use after deploy ----
    new cdk.CfnOutput(this, 'SiteUrl', { value: `https://${frontend.distributionDomainName}` })
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: compute.api.apiEndpoint })
    new cdk.CfnOutput(this, 'UserPoolId', { value: auth.userPool.userPoolId })
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: auth.userPoolClient.userPoolClientId })
    new cdk.CfnOutput(this, 'SiteBucketName', { value: frontend.bucketName })
    // For scripts/db-init.mjs (apply schema + seed exercises via the Data API):
    new cdk.CfnOutput(this, 'ClusterArn', { value: data.cluster.clusterArn })
    new cdk.CfnOutput(this, 'SecretArn', { value: data.secret.secretArn })
    new cdk.CfnOutput(this, 'DbName', { value: data.databaseName })
    new cdk.CfnOutput(this, 'AwsRegion', { value: cdk.Stack.of(this).region })

    // ---- cdk-nag: intentional demo trade-offs, each with a justification ----
    // These are the *documented* gaps between the cheap demo and a production build.
    // Every suppression is a conscious, reasoned decision, not an unknown.
    // The production fixes are listed in infra/README.md.
    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'AWS-managed policies appear only on CDK-generated custom-resource roles (e.g., S3 ' +
          'autoDeleteObjects, BucketDeployment). Acceptable for a demo; not on app roles.',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'Wildcards come from least-privilege CDK grants (Data API actions on this cluster, ' +
          'BucketDeployment to this bucket). Scope is constrained to project resources.',
      },
      {
        id: 'AwsSolutions-VPC7',
        reason: 'VPC Flow Logs omitted to avoid demo CloudWatch cost; enable for production audit.',
      },
      {
        id: 'AwsSolutions-RDS6',
        reason:
          'Direct IAM database authentication is not used because access goes through the RDS ' +
          'Data API (IAM-authorized) with credentials in Secrets Manager — there are no direct ' +
          'DB connections to authenticate. Enable IAM DB auth if switching to a pg driver.',
      },
      {
        id: 'AwsSolutions-SMG4',
        reason: 'Automatic secret rotation omitted for the demo (adds a rotation Lambda/cost); schedule rotation for production.',
      },
      {
        id: 'AwsSolutions-COG2',
        reason: 'MFA not required for the demo. Enable (and consider mandatory) for production.',
      },
      {
        id: 'AwsSolutions-COG8',
        reason: 'Cognito Plus feature plan (advanced security/MFA) is off to avoid demo cost; enable for production.',
      },
      {
        id: 'AwsSolutions-CFR1',
        reason: 'Geo restriction not needed for a personal demo; add for public-sector data-residency requirements.',
      },
      {
        id: 'AwsSolutions-CFR2',
        reason: 'AWS WAF is omitted to keep the demo at zero idle cost; attach a WebACL for production.',
      },
      {
        id: 'AwsSolutions-CFR3',
        reason: 'CloudFront access logging omitted for the demo; enable a log bucket for production audit.',
      },
      {
        id: 'AwsSolutions-CFR4',
        reason:
          'Using the default CloudFront certificate (no custom domain) for the demo, which forces ' +
          'TLSv1; a custom domain + ACM cert enforces TLSv1.2+ in production.',
      },
      {
        id: 'AwsSolutions-S1',
        reason: 'S3 server access logging omitted for the demo; enable a log bucket for production audit.',
      },
      {
        id: 'AwsSolutions-APIG1',
        reason: 'HTTP API access logging omitted for the demo; enable CloudWatch access logs for production audit.',
      },
      {
        id: 'AwsSolutions-APIG4',
        reason:
          'The only unauthorized route is the intentional public GET /health uptime probe. All ' +
          'application routes use the Cognito JWT authorizer by default.',
      },
      {
        id: 'AwsSolutions-RDS10',
        reason: 'Deletion protection is intentionally off so the demo can be cleanly destroyed; enable for production.',
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'Pinned to nodejs20.x (current LTS at build time) rather than always-latest for reproducible demos.',
      },
    ])
  }
}
