import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as kms from 'aws-cdk-lib/aws-kms'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'

export interface DataProps {
  readonly vpc: ec2.IVpc
}

/**
 * Aurora Serverless v2 (PostgreSQL) — the relational store.
 *
 * Why Aurora Serverless v2: keeps our existing relational schema verbatim (no DynamoDB
 * remodeling) AND scales capacity to zero when idle, which is the single biggest lever
 * for the "near-zero idle cost" goal.
 *
 * Cost knobs:
 *  - serverlessV2MinCapacity: 0  -> scale-to-zero. Pay only storage (~$0.10/GB-mo) when
 *    idle. Trade-off: a ~5–15s resume on the first query after a long idle. For "real",
 *    raise this to 0.5–1 ACU to remove the resume latency (and accept ~$43/mo+ idle).
 *  - serverlessV2MaxCapacity: 1  -> caps demo spend. Raise for production throughput.
 *
 * Security: storage encrypted with a customer-managed KMS key; credentials are generated
 * into Secrets Manager (never hardcoded); the Data API is enabled so callers use IAM +
 * the secret instead of managing DB connections.
 */
export class Data extends Construct {
  public readonly cluster: rds.DatabaseCluster
  public readonly secret: secretsmanager.ISecret
  public readonly databaseName = 'workout'

  constructor(scope: Construct, id: string, props: DataProps) {
    super(scope, id)

    // Customer-managed key so we control rotation and key policy (Well-Architected:
    // Security). For a pure demo you could use the AWS-managed key to save $1/mo.
    const key = new kms.Key(this, 'DbKey', {
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // demo: clean teardown
      description: 'KMS key for Workout Tracker Aurora storage encryption',
    })

    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        // Use a version that supports Serverless v2 scale-to-zero.
        version: rds.AuroraPostgresEngineVersion.VER_16_4,
      }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      serverlessV2MinCapacity: 0, // scale to zero when idle
      serverlessV2MaxCapacity: 1, // cap demo spend
      defaultDatabaseName: this.databaseName,
      // Generated master credentials -> Secrets Manager (rotatable). No plaintext.
      credentials: rds.Credentials.fromGeneratedSecret('app', {
        secretName: 'workout-tracker/db',
      }),
      enableDataApi: true, // lets Lambda query via IAM + Data API, no VPC attachment
      storageEncryptionKey: key,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // demo: destroy with the stack
      // For "real": set deletionProtection: true and a backup retention window.
    })

    // Non-null because we provided generated credentials above.
    this.secret = this.cluster.secret!
  }
}
