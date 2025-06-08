# 모듈 1: 로컬 개발 환경 설정 및 정적 웹사이트 호스팅

![Architecture](../images/module-1/architecture-module-1.png)

**완료에 필요한 시간:** 20분

---
**시간이 부족한 경우:** `module-1/cdk`에 있는 완전한 레퍼런스 AWS CDK 코드를 참고하세요

---

**사용된 서비스:**

* [Amazon Simple Storage Service (S3)](https://aws.amazon.com/s3/)
* [Amazon CloudFront](https://aws.amazon.com/cloudfront/)

이번 모듈에서는 주어진 지시에 따라 로컬 개발 환경을 설정하고, 첫번째 버전의 정적 TodoList 웹사이트를 배포합니다. [Amazon S3](https://aws.amazon.com/s3/)는 HTTP를 통해 저장된 객체를 직접적으로 제공할 수 있는 내구성이 뛰어나고, 가용성이 높으며, 저렴한 객체 스토리지 서비스입니다. Amazon CloudFront는 네트워크 및 애플리케이션 수준의 보호 기능을 모두 제공하는 매우 안전한 CDN입니다. 애플리케이션과 트래픽은 추가 비용없이 AWS Shield Standard와 같은 다양한 내재된 보호 기능을 통해 이점을 얻습니다. 추가 비용 없이 사용자 지정 SSL 인증서를 생성 및 관리할 수 있는 AWS Certificate Manager (ACM)와 같은 기능도 사용할 수 있습니다.

S3와 CloudFront의 조합은 정적 웹 콘텐츠(html, js, css, 미디어 등)를 인터넷 사이트의 웹 브라우저에 직접 제공할 수 있는 매우 유용한 기능을 제공합니다. S3를 활용하여 콘텐츠를 호스팅하고 빠른 콘텐츠 전송 네트워크(CDN) 서비스인 CloudFront로 우리의 TodoList 웹사이트를 짧은 대기 시간과 빠른 전송 속도로 전 세계 고객에게 안전하게 제공할 것입니다.

## 코드 기반 인프라 (Infrastructure As Code)

다음으로 Amazon S3에 정적 웹사이트의 형태로 호스팅되어 CloudFront 콘텐츠 전송 네트워크(CDN)로 사용자에게 배포 될 웹 애플리케이션 코드를 위한 리포지토리 생성에 필요한 구성 요소를 만들어 보겠습니다. 이를 위해, [AWS CloudFormation](https://aws.amazon.com/cloudformation/)이라는 도구를 사용하여 우리의 코드 기반 인프라 (Infrastructure as Code)를 생성해보겠습니다.

### AWS CloudFormation

AWS CloudFormation은 *CloudFormation 템플릿*이라는 JSON 또는 YAML 파일내에 선언한 AWS 리소스를 프로그래밍 방식으로 프로비저닝하는 서비스입니다. 이를 통해 *코드 기반 인프라*의 일반적인 모범 사례를 구현할 수 있습니다. AWS CloudFormation을 통해 다음을 수행할 수 있습니다:

* 예측 가능하고 반복적으로 AWS 인프라 배포를 생성하고 프로비저닝
* Amazon EC2, Amazon Elastic Block Store, Amazon SNS, Elastic Load Balancing 및 Auto Scaling과 같은 AWS 제품을 활용
* AWS 인프라의 생성 및 구성에 대한 걱정없이 안정성이 높고, 확장 가능하며, 비용 효율적인 애플리케이션을 클라우드에서 구축 
* 템플릿 파일을 사용하여 리소스 모음을 단일 단위(스택)로 만들고 제거

### AWS Cloud Development Kit (AWS CDK)

CloudFormation을 생성하기위해 [AWS Cloud Development Kit](https://aws.amazon.com/cdk/) (AWS CDK)를 활용합니다. AWS CDK는 코드로 클라우드 인프라를 정의하고 AWS CloudFormation을 통해 프로비저닝하는 오픈 소스 소프트웨어 개발 프레임워크입니다. CDK는 AWS 서비스와 완전히 통합되며 높은 수준의 객체 지향 추상화를 제공하여 AWS 리소스를 명령형으로 정의합니다. CDK의 인프라 컨스트럭츠 라이브러리를 사용하여 인프라 정의에 AWS 모범 사례를 쉽게 캡슐화하고 보일러플레이트 로직에 대한 걱정없이 공유할 수 있습니다. CDK는 현대 프로그래밍 언어의 강력한 기능을 사용하여 AWS 인프라를 예측 가능하고 효율적인 방식으로 정의할 수 있어 엔드 투 엔드 개발 경험을 향상시킵니다.

CDK가 지원하는 프로그래밍 언어(C#/.NET, Java, JavaScript, Python, TypeScript) 중 하나를 사용하여 클라우드 리소스를 정의하는데 사용할 수 있습니다. 개발자는 지원하는 프로그래밍 언어 중 하나를 사용하여 컨스트럭츠(Constructs)라는 재사용 가능한 클라우드 구성 요소를 정의할 수 있습니다. 이 컨스트럭츠를 스택과 앱으로 구성하여 사용합니다.

AWS CDK의 가장 큰 이점 중 하나는 재사용성의 원칙입니다. 애플리케이션과 팀 전체에서 구성 요소를 작성, 재사용, 그리고 공유할 수 있다는 것입니다. 이러한 구성 요소를 AWS CDK 내에서 컨스트럭츠(Constructs)라고 합니다. 모듈 1에서 작성할 코드는 나머지 모듈에서 재사용됩니다.

### CDK App 폴더 초기화

> 아래 모든 이동 커맨드는 cli가 연결될 수 있도록 작성되어 있습니다. 순서 외 폴더이동을 하였다면 다시 초기화 해주세요.

AWS CDK 애플리케이션을 포함할 새로운 폴더를 생성합니다:

```sh
mkdir cdk && cd cdk
```

`cdk` 폴더에서 CDK 앱을 초기화합니다. 이 앱은 현재 지원하는 다음의 프로그래밍 언어 중 선택할 수 있습니다: csharp (C#), fsharp(F#), go (Go), java (Java), javascript (JavaScript), python (Python), typescript (TypeScript). TEMPLATE은 선택한 언어로 앱을 초기화할 때 생성되는 기본 앱과는 다른 앱을 생성할 때 사용할 수 있는 선택적인 템플릿입니다.

`cdk init app --language LANGUAGE`

본 워크샵에서는 TypeScript을 프로그래밍 언어로 선택합니다:

```sh
cdk init app --language typescript
```

위의 명령으로 새로운 CDK 앱이 `cdk` 폴더에 초기화됩니다. 초기화 과정의 일환으로 해당 디렉토리는 새로운 git 리포지토리로 설정됩니다.

`bin` 폴더와 `lib` 폴더로 구성된 AWS CDK 앱의 표준 구조를 확인하시기 바랍니다.

* `bin` 폴더는 CDK 앱의 진입점을 정의할 곳입니다.
* `lib` 폴더는 워크샵에 필요한 인프라 구성요소를 정의할 곳입니다.

> **참고:** 직접 스택 파일들을 생성할 것이므로 `cdk/lib/cdk-stack.ts` 파일과 `cdk/test/cdk.test.ts` 파일을 삭제해주세요.

```sh
rm -rf lib/cdk-stack.ts
rm -rf test/
```

## TodoList 웹사이트 생성

이제 웹사이트 호스팅에 필요한 인프라를 정의해봅니다. 

`lib` 폴더 안에 `web-application-stack.ts` 이름의 새 파일을 생성한 후, 그리고 다음 코드를 복사하거나 똑같이 작성하여 스켈레톤 클래스 구조를 정의합니다:

```sh
touch lib/web-application-stack.ts
```

```typescript
import * as cdk from 'aws-cdk-lib';

export class WebApplicationStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    // The code that defines your stack goes here
  }
}
```

`bin/cdk.ts` 파일에서 `WebApplicationStack`을 import 하기 위한한 구문을 추가합니다:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebApplicationStack } from "../lib/web-application-stack";

const app = new cdk.App();
new WebApplicationStack(app, "TodoList-Website");
```

이제 필요한 파일이 준비되었으므로, S3와 CloudFront 인프라를 정의합니다.

### 웹 애플리케이션 코드 복사

루트 디렉토리에서 웹 애플리케이션 코드를 저장할 새로운 디렉토리를 생성합니다:

```sh
cd ../
mkdir web
```

웹사이트 정적 콘텐츠를 `source/module-1/web` 디렉토리에서 복사합니다:

```sh
cp -r source/module-1/web/* ./web
```

### 루트 디렉토리 정의

webAppRoot 변수가 `web` 디렉토리를 가르키는지 확인합니다. `web-application-stack.ts`에서 `path` 모듈을 import 합니다. 이 `path` 모듈로 웹사이트 폴더의 경로를 확인할 수 있습니다:

```typescript
import path = require('path');
```

다음으로 필요한 AWS CDK 라이브러리를 import 합니다:

```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
```

이제 `web-application-stack.ts` 생성자에서 다음 코드를 작성합니다:

```typescript
const webAppRoot = path.resolve(__dirname, '..', '..', 'web');
```

### S3 버킷 정의

S3 버킷을 정의하고 인덱스 문서를 'index.html'로 정의합니다:

```typescript
const bucket = new s3.Bucket(this, "Bucket", {
  websiteIndexDocument: "index.html"
});
```

### S3 버킷 접근 제어

S3 버킷으로의 접근을 제어하여 CloudFront 배포에서만 접근할 수 있도록 합니다. 이를 위해 [Origin Access Identity (OAI)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)를 사용하여 CloudFront만 접근하여 사용자에게 파일을 제공하도록 합니다.

`web-application-stack.ts` 생성자 안에 다음 코드를 작성합니다:

```typescript
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
```

### CloudFront 배포

다음으로 새로운 CloudFront 웹 배포에 대한 정의를 작성합니다:

```typescript
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
```

### 웹사이트 콘텐츠를 S3 버킷에 업로드

이제 편리한 CDK 헬퍼를 사용하여 지정한 소스 디렉토리를 압축한 뒤 대상 S3 버킷에 업로드 합니다:

```typescript
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
```

### CloudFormation 출력

마지막으로 CloudFront 배포에 할당된 도메인 이름에 대한 CloudFormation 출력을 정의합니다:

```typescript
new cdk.CfnOutput(this, "CloudFrontURL", {
  description: "The CloudFront distribution URL",
  value: "http://" + cdn.distributionDomainName
});
```

이것으로 모듈 1 스택의 구성 요소 작성을 완료했습니다. `cdk`폴더는 레퍼런스로 구현된 `source/module-1/cdk` 디렉토리와 유사한 구성이어야 하니 참고 바랍니다.

### 합성된 CloudFormation 템플릿 보기

`cdk/` 폴더에서 `cdk synth TodoList-Website`를 실행하여 지금까지 작성한 코드 기반의 CloudFormation 템플릿을 출력합니다.

```sh
cd cdk
cdk synth TodoList-Website > synth.yaml
```

### 웹사이트와 인프라 배포

콘텐츠를 S3 환경에 배포하는 AWS CDK 앱을 처음 배포할 때는 "bootstrap stack"을 설치해야 합니다. 이 기능은 CDK 툴킷 작동에 필요한 리소스를 생성합니다. 현재의 bootstrap 명령은 Amazon S3 버킷만 생성합니다:

**"cdk bootstrap" 명령어는 계정 + 리전 조합당 한 번입니다.**
먼저 cdk를 사용한적이 있는지 확인하기 위해 다음 명령어를 쳐봅니다

```sh
# 현재 계정/리전에 bootstrap 되어있는지 확인
aws cloudformation describe-stacks --stack-name CDKToolkit
```

TODO: 존재하지 않을 때 어떻게 뜨는지 확인해보기
만약 존재한다면 아래 bootstrap을 하지 않아도 됩니다. (재실행해도 문제되지는 않음)


> **참고:** AWS CDK로 인해 버킷에 저장되는 객체들과 관련한 비용이 청구됩니다. 그 이유는 AWS CDK가 버킷에서 어떠한 객체도 삭제하지 않기 때문이며 AWS CDK를 사용할 때 생성되는 파일들은 지속적으로 누적되어 저장됩니다. 계정 내에서 TodoList-Website 스택을 제거함으로써 버킷을 제거할 수 있습니다.

```sh
cdk bootstrap
```

이제 다음과 같이 `cdk` 폴더내에서 배포하고자하는 스택 지정과 함께 `cdk deploy` 명령을 실행하여 `TodoList-Website`를 배포할 수 있습니다:

  cdk deploy _stackname_

다음 명령을 실행합니다:

```sh
cdk deploy TodoList-Website
```

`Do you wish to deploy these changes (y/n)?`와 같은 메시지가 표시되며 `y`를 입력합니다.

그러면 AWS CDK가 다음 작업들을 수행할 것 입니다:

* S3 버킷 생성
* CloudFront 배포를 생성하여 S3에서 호스팅 되는 웹사이트 코드 전달
* CloudFront가 S3 버킷에 접근할 수 있도록 접근 활성
* 버킷에 이미 존재하는 파일들 제거
* 로컬 정적 콘텐츠를 버킷에 복사
* 사이트에 접근할 수 있는 URL을 출력

> **참고:** CloudFront 구성에 시간이 걸리니, 모듈 2로 넘어가 진행하고, 스택 배포가 완료된 뒤 다시 돌아와 아래 단계를 진행하시기 바랍니다. [모듈 2 진행](../module-2/README.md)

표시된 URL로 이동하여 웹사이트를 확인합니다.

> **참고:** 배포에 시간이 걸립니다. 새로운 터미널을 생성하여, 모듈 2를 진행하셔도 됩니다. 다만, 모듈 2에서의 cdk deploy를 통한 배포는, 현재 모듈의 배포가 완료된 뒤 진행하시기 바랍니다.

축하합니다! 기본적인 정적 TodoList 웹사이트를 만들었습니다!

### 웹사이트 업데이트

웹사이트의 내용을 수정한 후 변경사항을 배포하려면 다음 명령어를 실행합니다:

```sh
cdk deploy TodoList-Website
```

### 리소스 정리

모든 예제는 리소스 정리가 중요합니다.
다음 예제로 넘어가지 않으실 경우에는 리소스 정리를 꼭 해주세요.

```sh
cdk destroy TodoList-Website
```

이것으로 모듈 1을 마치겠습니다.

[모듈 2 진행](../module-2/README.md)

## [AWS Developer Center](https://developer.aws)
