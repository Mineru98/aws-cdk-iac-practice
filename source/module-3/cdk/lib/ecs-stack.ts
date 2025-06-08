import * as cdk from 'aws-cdk-lib';

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';

interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.Vpc,
  ecrRepository: ecr.Repository
}

export class EcsStack extends cdk.Stack {
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecsService: ecsPatterns.NetworkLoadBalancedFargateService;

  constructor(scope: cdk.App, id: string, props: EcsStackProps) {
    super(scope, id);

    this.ecsCluster = new ecs.Cluster(this, "Cluster", {
      clusterName: "TodoList-Cluster",
      vpc: props.vpc
    });
    this.ecsCluster.connections.allowFromAnyIpv4(ec2.Port.tcp(8080));


    this.ecsService = new ecsPatterns.NetworkLoadBalancedFargateService(this, "Service", {
      cluster: this.ecsCluster,
      desiredCount: 1,
      publicLoadBalancer: true,
      taskImageOptions: {
        enableLogging: true,
        containerName: "TodoList-Service",
        containerPort: 8080,
        image: ecs.ContainerImage.fromEcrRepository(props.ecrRepository),
      }
    });
    this.ecsService.service.connections.allowFrom(ec2.Peer.ipv4(props.vpc.vpcCidrBlock), ec2.Port.tcp(8080));
  }
}