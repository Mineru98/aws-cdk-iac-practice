
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';

interface DynamoDbStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  fargateService: ecs.FargateService;
}

export class DynamoDbStack extends cdk.Stack {
  public readonly table: dynamodb.Table;


  constructor(scope: cdk.App, id: string, props: DynamoDbStackProps) {
    super(scope, id);

    const dynamoDbEndpoint = props.vpc.addGatewayEndpoint("DynamoDbEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB
    });

    const dynamoDbPolicy = new iam.PolicyStatement();
    dynamoDbPolicy.addAnyPrincipal();
    dynamoDbPolicy.addActions("*");
    dynamoDbPolicy.addAllResources();

    dynamoDbEndpoint.addToPolicy(
      dynamoDbPolicy
    );

    this.table = new dynamodb.Table(this, "Table", {
      tableName: "TodoTable",
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.NUMBER
      }
    });

    const fargatePolicy = new iam.PolicyStatement();
    fargatePolicy.addActions(
      // ECS 태스크가 DynamoDB의 TodoTable에만 상호 작용할 수 있도록 허용
      "dynamodb:Scan",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
      "dynamodb:GetItem",
      "dynamodb:DescribeTable"
    );
    fargatePolicy.addResources(
      "arn:aws:dynamodb:*:*:table/TodoTable*"
    );
    props.fargateService.taskDefinition.addToTaskRolePolicy(
      fargatePolicy
    );
  }
}