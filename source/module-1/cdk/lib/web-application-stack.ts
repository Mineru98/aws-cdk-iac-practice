import * as cdk from 'aws-cdk-lib';
import path = require('path');

import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'

export class WebApplicationStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);
    const webAppRoot = path.resolve(__dirname, '..', '..', 'web');


    const bucket = new s3.Bucket(this, "Bucket", {
      websiteIndexDocument: "index.html"
    });

    // Use OriginAccessControl instead of OriginAccessIdentity
    const oac = new cloudfront.S3OriginAccessControl(this, "OAC", {
      description: "OAC for todo-list"
    });

    // Grant read permissions to CloudFront
    bucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${bucket.bucketArn}/*`],
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/*`
        }
      }
    }));

    const cdn = new cloudfront.Distribution(this, "CloudFront", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket, {
          originAccessControl: oac,
          originPath: '/web'
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL
      },
      defaultRootObject: 'index.html'
    });


    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [
        s3deploy.Source.asset(webAppRoot)
      ],
      destinationKeyPrefix: "web/",
      destinationBucket: bucket,
      distribution: cdn,
      distributionPaths: ['/*'],
      retainOnDelete: false
    });

    new cdk.CfnOutput(this, "CloudFrontURL", {
      description: "The CloudFront distribution URL",
      value: "http://" + cdn.distributionDomainName
    });
  }
}