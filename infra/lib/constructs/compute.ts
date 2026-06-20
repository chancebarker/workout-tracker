import * as path from 'path'
import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { HttpApi, HttpMethod, HttpNoneAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers'

export interface ComputeProps {
  readonly cluster: rds.DatabaseCluster
  readonly dbSecret: secretsmanager.ISecret
  readonly databaseName: string
  readonly userPool: cognito.IUserPool
  readonly userPoolClient: cognito.IUserPoolClient
}

/**
 * The API tier: our Express app on Lambda, fronted by an API Gateway HTTP API.
 *
 *  - Lambda runs the existing Express app via @codegenie/serverless-express (see
 *    ../lambda/api). NodejsFunction bundles it with esbuild.
 *  - The function reaches Postgres through the RDS Data API (no VPC attachment, no NAT),
 *    using IAM + the generated secret — both least-privilege grants below.
 *  - The HTTP API's default authorizer is the Cognito user pool, so every route is JWT
 *    protected except an explicit public /health.
 */
export class Compute extends Construct {
  public readonly fn: NodejsFunction
  public readonly api: HttpApi
  public readonly apiDomain: string

  constructor(scope: Construct, id: string, props: ComputeProps) {
    super(scope, id)

    this.fn = new NodejsFunction(this, 'ApiFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '..', '..', 'lambda', 'api', 'index.mjs'),
      handler: 'handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE, // X-Ray
      environment: {
        // The Data API needs the cluster ARN + the secret ARN; never the raw password.
        CLUSTER_ARN: props.cluster.clusterArn,
        SECRET_ARN: props.dbSecret.secretArn,
        DB_NAME: props.databaseName,
        // Useful if the app ever verifies tokens itself; the API GW authorizer already does.
        USER_POOL_ID: props.userPool.userPoolId,
        USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: { format: cdk.aws_lambda_nodejs.OutputFormat.ESM, minify: true, sourceMap: true },
    })

    // --- Least-privilege grants (scoped to THIS cluster + THIS secret) ---
    // grantDataApiAccess permits rds-data:* on the cluster and reading its admin secret.
    props.cluster.grantDataApiAccess(this.fn)
    props.dbSecret.grantRead(this.fn)

    // --- HTTP API with a Cognito JWT authorizer as the default ---
    const authorizer = new HttpUserPoolAuthorizer('CognitoAuthorizer', props.userPool, {
      userPoolClients: [props.userPoolClient],
    })
    const integration = new HttpLambdaIntegration('ApiIntegration', this.fn)

    this.api = new HttpApi(this, 'HttpApi', {
      defaultAuthorizer: authorizer,
      defaultIntegration: integration,
    })

    // Catch-all: every path/method, protected by the default Cognito authorizer.
    this.api.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration,
    })

    // Public health check (no auth) for uptime probes.
    this.api.addRoutes({
      path: '/health',
      methods: [HttpMethod.GET],
      integration,
      authorizer: new HttpNoneAuthorizer(),
    })

    // CloudFront will use this as the /api/* origin domain (no protocol, no path).
    this.apiDomain = `${this.api.apiId}.execute-api.${cdk.Stack.of(this).region}.${cdk.Stack.of(this).urlSuffix}`
  }
}
