import * as cdk from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { ServicePrincipal }from 'aws-cdk-lib/aws-iam';
import { CfnDeliveryStream }from 'aws-cdk-lib/aws-kinesisfirehose';

interface KinesisFirehoseStackProps extends cdk.StackProps {
  table: dynamodb.Table;
}

export class KinesisFirehoseStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: KinesisFirehoseStackProps) {
    super(app, id);
    
    const lambdaRepository = new codecommit.Repository(this, "ClicksProcessingLambdaRepository", {
      repositoryName: "MythicalMysfits-ClicksProcessingLambdaRepository"
    });
    
    new cdk.CfnOutput(this, "kinesisRepositoryCloneUrlHttp", {
      value: lambdaRepository.repositoryCloneUrlHttp,
      description: "Clicks Processing Lambda Repository Clone Url HTTP"
    });
    
    new cdk.CfnOutput(this, "kinesisRepositoryCloneUrlSsh", {
      value: lambdaRepository.repositoryCloneUrlSsh,
      description: "Clicks Processing Lambda Repository Clone Url SSH"
    });
    
    const clicksDestinationBucket = new s3.Bucket(this, "Bucket", {
      versioned: true
    });
    
    const lambdaFunctionPolicy =  new iam.PolicyStatement();
    lambdaFunctionPolicy.addActions("dynamodb:GetItem");
    lambdaFunctionPolicy.addResources(props.table.tableArn);
    
    const mysfitsClicksProcessor = new lambda.Function(this, "Function", {
      handler: "streamProcessor.processRecord",
      runtime: lambda.Runtime.PYTHON_3_9,
      description: "An Amazon Kinesis Firehose stream processor that enriches click records" +
        " to not just include a mysfitId, but also other attributes that can be analyzed later.",
      memorySize: 128,
      code: lambda.Code.fromAsset("../../lambda-streaming-processor"),
      timeout: cdk.Duration.seconds(30),
      initialPolicy: [
        lambdaFunctionPolicy
      ],
      environment: {
        MYSFITS_API_URL: "https://mprcl8p2t9.execute-api.ap-northeast-2.amazonaws.com/prod/"
      }
    });
    
    const firehoseDeliveryRole = new iam.Role(this, "FirehoseDeliveryRole", {
      roleName: "FirehoseDeliveryRole",
      assumedBy: new ServicePrincipal("firehose.amazonaws.com"),
      externalIds: [cdk.Aws.ACCOUNT_ID]
    });
    
    const firehoseDeliveryPolicyS3Stm = new iam.PolicyStatement();
    firehoseDeliveryPolicyS3Stm.addActions("s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject");
    firehoseDeliveryPolicyS3Stm.addResources(clicksDestinationBucket.bucketArn);
    firehoseDeliveryPolicyS3Stm.addResources(clicksDestinationBucket.arnForObjects('*'));
    
    const firehoseDeliveryPolicyLambdaStm = new iam.PolicyStatement();
    firehoseDeliveryPolicyLambdaStm.addActions("lambda:InvokeFunction");
    firehoseDeliveryPolicyLambdaStm.addResources(mysfitsClicksProcessor.functionArn);
    
    firehoseDeliveryRole.addToPolicy(firehoseDeliveryPolicyS3Stm);
    firehoseDeliveryRole.addToPolicy(firehoseDeliveryPolicyLambdaStm);
    
    const mysfitsFireHoseToS3 = new CfnDeliveryStream(this, "DeliveryStream", {
      extendedS3DestinationConfiguration: {
        bucketArn: clicksDestinationBucket.bucketArn,
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 50
        },
        compressionFormat: "UNCOMPRESSED",
        prefix: "firehose/",
        roleArn: firehoseDeliveryRole.roleArn,
        processingConfiguration: {
          enabled: true,
          processors: [
            {
              parameters: [
                {
                  parameterName: "LambdaArn",
                  parameterValue: mysfitsClicksProcessor.functionArn
                }
              ],
              type: "Lambda"
            }
          ]
        }
      }
    });
    
    new lambda.CfnPermission(this, "Permission", {
      action: "lambda:InvokeFunction",
      functionName: mysfitsClicksProcessor.functionArn,
      principal: "firehose.amazonaws.com",
      sourceAccount: cdk.Aws.ACCOUNT_ID,
      sourceArn: mysfitsFireHoseToS3.attrArn
    });
    
    const clickProcessingApiRole = new iam.Role(this, "ClickProcessingApiRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com")
    });
    
    const apiPolicy = new iam.PolicyStatement();
    apiPolicy.addActions("firehose:PutRecord");
    apiPolicy.addResources(mysfitsFireHoseToS3.attrArn);
    new iam.Policy(this, "ClickProcessingApiPolicy", {
      policyName: "api_gateway_firehose_proxy_role",
      statements: [
        apiPolicy
      ],
      roles: [clickProcessingApiRole]
    });
    
    const api = new apigw.RestApi(this, "APIEndpoint", {
        restApiName: "ClickProcessing API Service",
        endpointTypes: [ apigw.EndpointType.REGIONAL ]
    });
    
    const clicks = api.root.addResource('clicks');
    
    clicks.addMethod('PUT', new apigw.AwsIntegration({
        service: 'firehose',
        integrationHttpMethod: 'POST',
        action: 'PutRecord',
        options: {
            connectionType: apigw.ConnectionType.INTERNET,
            credentialsRole: clickProcessingApiRole,
            integrationResponses: [
              {
                statusCode: "200",
                responseTemplates: {
                  "application/json": '{"status":"OK"}'
                },
                responseParameters: {
                  "method.response.header.Access-Control-Allow-Headers": "'Content-Type'",
                  "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,PUT'",
                  "method.response.header.Access-Control-Allow-Origin": "'*'"
                }
              }
            ],
            requestParameters: {
              "integration.request.header.Content-Type": "'application/x-amz-json-1.1'"
            },
            requestTemplates: {
              "application/json": `{ "DeliveryStreamName": "${mysfitsFireHoseToS3.ref}", "Record": { "Data": "$util.base64Encode($input.json('$'))" }}`
            }
        }
    }), {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Origin": true
            }
          }
        ]
      }
    );
    
    clicks.addMethod("OPTIONS", new apigw.MockIntegration({
      integrationResponses: [{
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Headers":
            "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
          "method.response.header.Access-Control-Allow-Origin": "'*'",
          "method.response.header.Access-Control-Allow-Credentials":
            "'false'",
          "method.response.header.Access-Control-Allow-Methods":
            "'OPTIONS,GET,PUT,POST,DELETE'"
        }
      }],
      passthroughBehavior: apigw.PassthroughBehavior.NEVER,
      requestTemplates: {
        "application/json": '{"statusCode": 200}'
      }
    }), {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Credentials": true,
              "method.response.header.Access-Control-Allow-Origin": true
            }
          }
        ]
      }
    );
  }
}