import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'

/**
 * ============================================================================
 * TARGET B — Containers (Replatform). STUB / DOCUMENTATION ONLY.
 * ============================================================================
 *
 * This class is intentionally NOT instantiated in bin/app.ts. It documents the container
 * alternative so the trade-off in ADR-0001 is demonstrable, not merely asserted. To build
 * it for real you would flesh out the resources sketched below.
 *
 * Architecture:
 *   CloudFront + S3 (same as Target A frontend)
 *      └── /api/*  ->  Application Load Balancer (public subnets)
 *                        └── ECS Fargate service (private subnets) running the
 *                            containerized Express app (ECR image)
 *                              └── RDS PostgreSQL (private subnets, Multi-AZ option)
 *   VPC: public + private subnets, NAT gateway for egress, security groups.
 *   Cognito + Secrets Manager + KMS as in Target A.
 *
 * Why it's the runner-up here (see ARCHITECTURE.md §2.4–2.5):
 *   IDLE COST is the killer for a low/spiky workload. Always-on billers:
 *     - NAT Gateway        ~$32/mo each   (egress for image pulls / outbound)
 *     - ALB                ~$16–22/mo     (hourly + LCU)
 *     - Fargate task       ~$9+/mo        (>=1 task must stay running behind the ALB)
 *     - RDS instance       ~$12+/mo       (db.t4g.micro; Multi-AZ ~doubles it)
 *   => ~$45–110/mo floor BEFORE the first request, vs ~$2–6/mo for Target A at idle.
 *
 * When Target B wins:
 *   - sustained, steady, high-throughput traffic (flat cost beats per-request)
 *   - need for full runtime control / container parity with other environments
 *   - long-running or non-HTTP workloads that don't fit Lambda's model
 *
 * Cheapest-viable demo levers if you DID build it:
 *   - single NAT gateway (not one per AZ), or a NAT instance (t4g.nano ~$3/mo),
 *     or VPC interface/gateway endpoints (ECR, S3, Secrets, Logs) to drop NAT entirely
 *   - one 0.25 vCPU / 0.5 GB Fargate task; RDS db.t4g.micro single-AZ (free tier 12 mo)
 *   - Fargate Spot for non-critical demo tasks
 *
 * Sketch (pseudocode — uncomment & complete with aws-ecs / aws-ecs-patterns to build):
 *
 *   const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2, natGateways: 1 });
 *   const cluster = new ecs.Cluster(this, 'Cluster', { vpc });
 *   const db = new rds.DatabaseInstance(this, 'Db', {
 *     engine: rds.DatabaseInstanceEngine.postgres({ version: ... }),
 *     instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MICRO),
 *     vpc, vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
 *     multiAz: false, // true for HA in production
 *     storageEncrypted: true,
 *   });
 *   const svc = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Api', {
 *     cluster,
 *     cpu: 256, memoryLimitMiB: 512, desiredCount: 1,
 *     taskImageOptions: {
 *       image: ecs.ContainerImage.fromAsset('../'), // Dockerfile building the Express app
 *       secrets: { DB: ecs.Secret.fromSecretsManager(db.secret!) },
 *     },
 *     publicLoadBalancer: true,
 *   });
 *   // CloudFront /api/* -> svc.loadBalancer.loadBalancerDnsName
 */
export class TargetBContainersStub extends Construct {
  constructor(scope: Construct, id: string, _props?: cdk.StackProps) {
    super(scope, id)
    throw new Error(
      'TargetBContainersStub is documentation only. See ADR-0001 and ARCHITECTURE.md; ' +
        'Target A (serverless) is the built target.'
    )
  }
}
