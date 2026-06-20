import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'

/**
 * Cognito — managed identity, replacing the app's hand-rolled JWT + bcrypt.
 *
 * Why: offloads password storage, MFA, account recovery, and token issuance to a managed
 * service (Well-Architected: Security). The HTTP API validates Cognito-issued JWTs via a
 * built-in authorizer, so there is no custom auth code to maintain or get wrong.
 *
 * Migrating existing users: bcrypt hashes can't be bulk-imported into Cognito. Attach a
 * User Migration Lambda trigger that validates the legacy hash on first sign-in and
 * transparently re-enrolls the user (see MIGRATION-RUNBOOK.md). Trigger wiring is omitted
 * here to keep the demo lean.
 */
export class Auth extends Construct {
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient

  constructor(scope: Construct, id: string) {
    super(scope, id)

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        fullname: { required: false, mutable: true },
      },
      // Strong policy satisfies cdk-nag AwsSolutions-COG1 (length + upper + digit + symbol).
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      // Advanced security adds risk-based MFA/anomaly detection (small cost). Enable for
      // anything resembling production, especially WWPS.
      // featurePlan: cognito.FeaturePlan.PLUS,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // demo: tear down with the stack
    })

    this.userPoolClient = this.userPool.addClient('WebClient', {
      authFlows: {
        userSrp: true, // SPA uses SRP (no client secret in the browser)
        userPassword: true, // convenient for local/dev testing; consider disabling in prod
      },
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    })
  }
}
