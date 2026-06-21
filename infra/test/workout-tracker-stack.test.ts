import { App } from 'aws-cdk-lib'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { WorkoutTrackerStack } from '../lib/workout-tracker-stack'

/**
 * Fine-grained assertion tests. They synthesize the stack to CloudFormation and assert the
 * decisions that matter most for security and cost — so a future change can't quietly undo
 * them. Asset bundling is disabled (context below) so esbuild/Docker aren't needed to test.
 */
function synth(): Template {
  const app = new App({
    // Skip Lambda bundling during unit tests — we only assert on the template shape.
    context: { 'aws:cdk:bundling-stacks': [] },
  })
  const stack = new WorkoutTrackerStack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  })
  return Template.fromStack(stack)
}

describe('WorkoutTrackerStack — cost decisions', () => {
  const t = synth()

  test('NO NAT gateways (the core idle-cost decision)', () => {
    t.resourceCountIs('AWS::EC2::NatGateway', 0)
  })

  test('Aurora Serverless v2 is configured to scale to zero', () => {
    t.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
      ServerlessV2ScalingConfiguration: { MinCapacity: 0, MaxCapacity: 1 },
    })
  })
})

describe('WorkoutTrackerStack — security decisions', () => {
  const t = synth()

  test('Aurora storage is encrypted and the Data API is enabled', () => {
    t.hasResourceProperties('AWS::RDS::DBCluster', {
      StorageEncrypted: true,
      EnableHttpEndpoint: true, // RDS Data API
    })
  })

  test('KMS key rotation is on', () => {
    t.hasResourceProperties('AWS::KMS::Key', { EnableKeyRotation: true })
  })

  test('Site bucket blocks all public access', () => {
    t.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    })
  })

  test('API Lambda has X-Ray tracing active and pinned runtime', () => {
    t.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      TracingConfig: { Mode: 'Active' },
    })
  })

  test('HTTP API is protected by a Cognito JWT authorizer', () => {
    t.hasResourceProperties('AWS::ApiGatewayV2::Api', { ProtocolType: 'HTTP' })
    t.hasResourceProperties('AWS::ApiGatewayV2::Authorizer', { AuthorizerType: 'JWT' })
  })

  test('Cognito user pool + client exist', () => {
    t.resourceCountIs('AWS::Cognito::UserPool', 1)
    t.resourceCountIs('AWS::Cognito::UserPoolClient', 1)
  })
})

describe('WorkoutTrackerStack — delivery & ops', () => {
  const t = synth()

  test('CloudFront proxies /api/* (same-origin, no CORS)', () => {
    t.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({ PathPattern: '/api/*' }),
        ]),
      }),
    })
  })

  test('an error alarm exists for the API function', () => {
    t.resourceCountIs('AWS::CloudWatch::Alarm', 1)
  })
})
