import { Construct } from 'constructs'
import * as ec2 from 'aws-cdk-lib/aws-ec2'

/**
 * Minimal VPC for the data tier.
 *
 * Cost note (the whole point): we create **zero NAT gateways** (~$32/mo each) and only
 * PRIVATE_ISOLATED subnets. Aurora lives here with no route to the internet. Because the
 * Lambda talks to Aurora through the **RDS Data API** (an AWS service endpoint, not a TCP
 * connection into the VPC), the function does not need to be VPC-attached and we avoid
 * both NAT and interface endpoints — nothing in this construct bills while idle.
 *
 * If you later switch the data layer from the Data API to a direct `pg` connection, you'd
 * put the Lambda in these subnets and add an interface endpoint for Secrets Manager
 * (still no NAT). That trade-off is documented in ARCHITECTURE.md.
 */
export class Network extends Construct {
  public readonly vpc: ec2.Vpc

  constructor(scope: Construct, id: string) {
    super(scope, id)

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2, // two AZs so Aurora can place a subnet group across AZs
      natGateways: 0, // <-- no NAT: no idle networking cost
      subnetConfiguration: [
        {
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    })
  }
}
