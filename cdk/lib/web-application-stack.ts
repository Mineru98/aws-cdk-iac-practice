// AWS CDK 라이브러리와 필요한 모듈들을 가져옵니다
import * as cdk from "aws-cdk-lib";
import path = require("path");

// AWS 서비스별 CDK 모듈들을 가져옵니다
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

// 웹 애플리케이션을 위한 CDK 스택 클래스를 정의합니다
export class WebApplicationStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    // 웹 애플리케이션 파일들이 있는 경로를 설정합니다
    const webAppRoot = path.resolve(__dirname, "..", "..", "web");

    // 정적 웹사이트 호스팅을 위한 S3 버킷을 생성합니다
    const bucket = new s3.Bucket(this, "Bucket", {
      websiteIndexDocument: "index.html", // 기본 인덱스 파일을 설정합니다
    });

    // CloudFront에서 S3 버킷에 접근하기 위한 OAC(Origin Access Control)를 생성합니다
    const oac = new cloudfront.S3OriginAccessControl(this, "OAC", {
      description: "OAC for todo-list", // OAC 설명을 추가합니다
    });

    // S3 버킷에 CloudFront가 접근할 수 있도록 리소스 정책을 추가합니다
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"], // S3 객체 읽기 권한을 부여합니다
        resources: [`${bucket.bucketArn}/*`], // 버킷 내 모든 객체에 대한 접근을 허용합니다
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")], // CloudFront 서비스에 권한을 부여합니다
        conditions: {
          StringEquals: {
            // 특정 CloudFront 배포에서만 접근 가능하도록 조건을 설정합니다
            "AWS:SourceArn": `arn:aws:cloudfront::${
              cdk.Stack.of(this).account
            }:distribution/*`,
          },
        },
      })
    );

    // 전세계적으로 빠른 콘텐츠 배포를 위한 CloudFront 배포를 생성합니다
    const cdn = new cloudfront.Distribution(this, "CloudFront", {
      defaultBehavior: {
        // S3 버킷을 오리진으로 설정하고 OAC를 적용합니다
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket, {
          originAccessControl: oac,
          originPath: "/web", // S3 버킷 내 /web 경로를 루트로 설정합니다
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS, // GET, HEAD, OPTIONS 메서드만 허용합니다
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL, // HTTP와 HTTPS 모두 허용합니다
      },
      defaultRootObject: "index.html", // 루트 경로 접근 시 기본으로 반환할 파일을 설정합니다
    });

    // 로컬 웹 파일들을 S3 버킷에 배포합니다
    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [s3deploy.Source.asset(webAppRoot)], // 배포할 소스 파일들의 경로를 지정합니다
      destinationKeyPrefix: "web/", // S3 버킷 내 저장될 경로를 설정합니다
      destinationBucket: bucket, // 대상 S3 버킷을 지정합니다
      distribution: cdn, // 배포 후 CloudFront 캐시를 무효화합니다
      distributionPaths: ["/*"], // 캐시 무효화할 경로를 설정합니다
      retainOnDelete: false, // 스택 삭제 시 파일들도 함께 삭제합니다
    });

    // CloudFront 배포 URL을 출력으로 내보냅니다
    new cdk.CfnOutput(this, "CloudFrontURL", {
      description: "The CloudFront distribution URL", // 출력 설명을 추가합니다
      value: "http://" + cdn.distributionDomainName, // CloudFront 도메인 이름을 HTTP URL로 조합합니다
    });
  }
}
