import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Network } from './constructs/network'
import { Data } from './constructs/data'
import { Auth } from './constructs/auth'
import { Compute } from './constructs/compute'
import { Frontend } from './constructs/frontend'
import { Observability } from './constructs/observability'

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

    // ---- Outputs you'll use after deploy ----
    new cdk.CfnOutput(this, 'SiteUrl', { value: `https://${frontend.distributionDomainName}` })
    new cdk.CfnOutput(this, 'ApiEndpoint', { value: compute.api.apiEndpoint })
    new cdk.CfnOutput(this, 'UserPoolId', { value: auth.userPool.userPoolId })
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: auth.userPoolClient.userPoolClientId })
    new cdk.CfnOutput(this, 'SiteBucketName', { value: frontend.bucketName })
  }
}
