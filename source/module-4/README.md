# 모듈 4: Amazon API Gateway와 AWS Cognito로 사용자 및 API 기능 추가

![Architecture](../images/module-4/architecture-module-4.png)

**완료에 필요한 시간:** 60분

---
**시간이 부족한 경우:** `module-4/cdk`에 있는 완전한 레퍼런스 AWS CDK 코드를 참고하세요

---

**사용된 서비스:**
* [Amazon Cognito](http://aws.amazon.com/cognito/)
* [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
* [Amazon Simple Storage Service (S3)](https://aws.amazon.com/s3/)

### 개요

TodoList 웹사이트에 사용자가 할일을 완료 상태로 토글하고, 삭제하는 것과 같은 더 중요한 기능을 추가하기 위해서는 먼저 웹사이트에 사용자 등록을 가능하게 해야합니다. 웹사이트 사용자의 등록 및 인증을 위해 완전히 관리되는 사용자 자격 증명 관리 서비스인 [**AWS Cognito**](http://aws.amazon.com/cognito/)에서 [**User Pool**](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)을 생성합니다.

등록된 사용자만 할일을 완료하고 삭제할 수 있도록 하고 싶으므로, Fargate에서 동작중인 Flask 웹 앱에서 해당하는 경로에 대한 접근을 제한하려고 합니다. 현재 Fargate 서비스가 사용하는 Network Load Balancer (NLB)는 요청 권한 헤더의 유효성 검사를 지원하지 않습니다. 이를 위해 몇 가지 옵션이 있습니다: [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)로 전환하여 Flask 웹 앱이 권한 부여 헤더를 확인하게 하거나, [Amazon API Gateway](https://aws.amazon.com/api-gateway/)를 사용할 수 있습니다.

Amazon API Gateway는 SSL 종료, CORS, 요청 권한 부여, 조정(throttling), API 단계 및 버전 관리 등과 같은 기본적으로 필요한 REST API 기능을 제공합니다. 이러한 이유로 NLB 앞에 API Gateway를 배포하도록 하겠습니다.

API Gateway는 HTTPS 및 CORS 지원 뿐만 아니라, Cognito User Pool과 통합하여 요청의 권한 부여 유효성 검사도 제공합니다. `/todos/{id}/toggle`와 `/todos/{id}` (DELETE) API 엔드포인트에는 인증된 사용자만 접근할 수 있도록 접근을 제한하겠습니다.

그런 다음 API Gateway는 트래픽을 NLB로 전달하여 Fargate에서 실행되는 Flask 웹 앱에서 처리되게끔 합니다.

### 웹사이트 사용자를 위한 User Pool 추가

#### Cognito User Pool 생성

모든 TodoList 방문자의 정보가 저장될 **Cognito User Pool**을 생성하기 위해, Cognito 스택을 정의할 새로운 TypeScript 파일을 만들겠습니다:

```sh
cd cdk/
touch lib/cognito-stack.ts
```

`cognito-stack.ts`파일을 열고 다음 스택 템플릿을 정의합니다:

```typescript
import * as cdk from 'aws-cdk-lib';

export class CognitoStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string) {
    super(scope, id);
  }
}
```

파일 맨 위에 AWS Cognito CDK 라이브러리에 대한 import 문을 추가합니다:

```typescript
import * as cognito from 'aws-cdk-lib/aws-cognito';
```

생성자 구문 바로 앞에 다음 퍼블릭 속성을 정의합니다:

```typescript
public readonly userPool: cognito.UserPool;
public readonly userPoolClient: cognito.UserPoolClient;
```

이제 _(`super(scope, id);` 구문 다음의)_ 생성자 안에서 Amazon Cognito UserPool을 정의합니다:

```typescript
this.userPool = new cognito.UserPool(this, 'UserPool', {
  userPoolName: 'TodoListUserPool',
  autoVerify: {
    email: true
  }
});
```

위 코드는 Cognito UserPool을 생성하고 풀에 등록된 모든 사용자가 인증된 사용자가 되기 전 인증용 이메일을 통해 자동으로 이메일 주소를 인증받도록 정의합니다.

마지막으로 수행해야할 작업은 웹 애플리케이션이 사용할 Amazon Cognito User Pool Client를 정의하는 것입니다.

다시 _(the super(scope, id); 구문 다음의)_ 생성자 내에서 Amazon Cognito UserPool Client를 정의합니다:

```typescript
this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
  userPool: this.userPool,
  userPoolClientName: 'TodoListUserPoolClient'
});
```

`cdk.CfnOutput` 구문을 정의하는 사용자 정의 출력 속성을 정의하여 생성된 CloudFormation 템플릿이 Cognito User Pool ID와 Cognito User Pool Client ID를 제공하도록 할 수 있습니다. Cognito User Pool ID와 Cognito User Pool Client ID에 대해 `cdk.CfnOutput`을 선언합니다:

```typescript
new cdk.CfnOutput(this, "CognitoUserPool", {
  description: "The Cognito User Pool",
  value: this.userPool.userPoolId
});

new cdk.CfnOutput(this, "CognitoUserPoolClient", {
  description: "The Cognito User Pool Client",
  value: this.userPoolClient.userPoolClientId
});
```

이걸로 `cognito-stack.ts` 파일은 다음과 같아야합니다:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class CognitoStack extends cdk.Stack {

  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  
  constructor(scope: cdk.App, id: string) {
    super(scope, id);
    
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'TodoListUserPool',
      autoVerify: {
        email: true
      }
    });
    
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'TodoListUserPoolClient'
    });
    
    new cdk.CfnOutput(this, "CognitoUserPool", {
      description: "The Cognito User Pool",
      value: this.userPool.userPoolId
    });
    
    new cdk.CfnOutput(this, "CognitoUserPoolClient", {
      description: "The Cognito User Pool Client",
      value: this.userPoolClient.userPoolClientId
    });
  }
}
```

Amazon Cognito 리소스를 정의하였습니다. 이제 `cdk.ts` 부트스트랩 파일에 추가하겠습니다.

`cdk.ts` 파일 상단에 다음의 `import`문을 삽입하여 새로운 `CognitoStack` 정의를 추가합니다:

```typescript
import { CognitoStack } from '../lib/cognito-stack';
```

`cdk.ts` 파일 끝에 다음 정의를 삽입합니다:

```typescript
const cognito = new CognitoStack(app,  "TodoList-Cognito");
```

지금까지 완료를하면 `bin/cdk.ts` 파일은 다음처럼 보여야합니다:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { CiCdStack } from "../lib/cicd-stack";
import { DynamoDbStack } from '../lib/dynamodb-stack';
import { CognitoStack } from '../lib/cognito-stack';

const app = new cdk.App();
new WebApplicationStack(app, "TodoList-Website");
const networkStack = new NetworkStack(app, "TodoList-Network");
const ecrStack = new EcrStack(app, "TodoList-ECR");
const ecsStack = new EcsStack(app, "TodoList-ECS", {
  vpc: networkStack.vpc,
  ecrRepository: ecrStack.ecrRepository
});
new CiCdStack(app, "TodoList-CICD", {
    ecrRepository: ecrStack.ecrRepository,
    ecsService: ecsStack.ecsService.service
});
const dynamoDbStack = new DynamoDbStack(app, "TodoList-DynamoDB", {
    vpc: networkStack.vpc,
    fargateService: ecsStack.ecsService.service
});
const cognito = new CognitoStack(app,  "TodoList-Cognito");
```

이제 Cognito 리소스를 배포합니다. 
`npm run build` 명령어를 실행 할 경우 로컬에서 컴파일 오류가 없는지 확인할 수 있습니다. 
그 후 AWS 계정에 애플리케이션을 배포합니다:

```sh
npm run build
cdk deploy TodoList-Cognito
```

이전 명령의 출력에서 Cognito User Pool ID와 the Cognito User Pool Client ID를 기록해둡니다. 이후 단계에서 필요합니다.

### Amazon API Gateway로 새 REST API 추가

#### API Gateway VPC Link 생성

다음으로 기존 Flask 서비스 앞에 새로운 RESTful API를 생성하여 NLB가 요청을 받기 전에 요청 권한 부여를 수행하는 부분을 진행하겠습니다. 모듈 개요에 설명한 것 처럼, **Amazon API Gateway**로 이 작업을 수행합니다. API Gateway를 NLB와 프라이빗하게 통합하기 위해, **API Gateway VPCLink**를 구성하여 API Gateway가 VPC 내에서 프라이빗하게 호스팅되는 백엔드 웹 서비스와 직접적으로 통합될 수 있도록 합니다.

> **참고:** 워크샵의 목적을 위해, NLB는 이전 모듈에서 직접 호출될 수 있도록 *internet-facing*으로 생성하였습니다. 이로 인해, 이 모듈 이후 API에 승인 토큰이 필요함에도 불구하고, NLB는 여전히 API Gateway API 뒤에 퍼블릭하게 열려있습니다. 실제 시나리오에서는 처음부터 NLB를 *internal*로 생성하거나 내부 로드 밸런서를 생성하여 기존걸 대체하는게 좋습니다. API Gateway는 인터넷 연결 API 권한 부여 전략이기 때문입니다. 시간 관계상, 퍼블릭하게 접근할 수 있도록 생성된 NLB를 그대로 사용하겠습니다.

#### Swagger를 사용한 REST API 생성

TodoList REST API는 JSON을 통해 API를 명시하기 위해 널리 사용되는 오픈 소스 프레임워크인 **Swagger**를 사용하여 정의 됩니다. API의 Swagger 정의는 `api/api-swagger.json`에 위치하고 있습니다. 이 파일을 열면 REST API와 그 안에 정의된 리소스, 메서드, 설정을 확인할 수 있습니다.

API 정의 내의 `securityDefinitions` 객체는 Authorization 헤더를 사용하여 apiKey 인증 메커니즘을 설정했음을 나타냅니다. AWS가 `x-amazon-api-gateway-` 접두사를 사용하여 Swagger에 사용자 정의 확장을 제공한걸 알 수 있을 것입니다. 이 확장을 통해 API Gateway 고유 기능을 일반적인 Swagger 파일에 추가하여 API Gateway 고유 기능의 이점을 얻을 수 있습니다.

AWS CDK로 VPCLink와 API Gateway를 생성하기 위해 `cdk/lib` 폴더 안에서 `apigateway-stack.ts` 이라는 파일을 생성합니다:

```sh
touch lib/apigateway-stack.ts
```

방금 생성한 파일에서 이전과 같이 스켈레톤 CDK Stack 구조를 정의하고 클래스명을 `APIGatewayStack`으로 지정합니다:

```typescript
import * as cdk from 'aws-cdk-lib';

interface APIGatewayStackProps extends cdk.StackProps {
  loadBalancerDnsName: string;
  loadBalancerArn: string;
  userPoolId: string;
}

export class APIGatewayStack extends cdk.Stack {
  constructor(scope: cdk.App, id:string, props: APIGatewayStackProps) {
    super(scope, id);

    // 스택을 정의하는 코드가 여기에 위치합니다
  }
}
```

그런 후 `bin/cdk.ts` 파일안의 CDK 애플리케이션에 APIGatewayStack을 추가합니다. 완료 후, `bin/cdk.ts` 파일은 다음처럼 보일 것입니다:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebApplicationStack } from "../lib/web-application-stack";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { EcsStack } from "../lib/ecs-stack";
import { CiCdStack } from "../lib/cicd-stack";
import { DynamoDbStack } from '../lib/dynamodb-stack';
import { CognitoStack } from '../lib/cognito-stack';
import { APIGatewayStack } from "../lib/apigateway-stack";

const app = new cdk.App();
new WebApplicationStack(app, "TodoList-Website");
const networkStack = new NetworkStack(app, "TodoList-Network");
const ecrStack = new EcrStack(app, "TodoList-ECR");
const ecsStack = new EcsStack(app, "TodoList-ECS", {
    vpc: networkStack.vpc,
    ecrRepository: ecrStack.ecrRepository
});
new CiCdStack(app, "TodoList-CICD", {
    ecrRepository: ecrStack.ecrRepository,
    ecsService: ecsStack.ecsService.service
});
const dynamoDbStack = new DynamoDbStack(app, "TodoList-DynamoDB", {
    vpc: networkStack.vpc,
    fargateService: ecsStack.ecsService.service
});
const cognito = new CognitoStack(app,  "TodoList-Cognito");
new APIGatewayStack(app, "TodoList-APIGateway", {
  userPoolId: cognito.userPool.userPoolId,
  loadBalancerArn: ecsStack.ecsService.loadBalancer.loadBalancerArn,
  loadBalancerDnsName: ecsStack.ecsService.loadBalancer.loadBalancerDnsName
});
```

`APIGatewayStack`에서, 작성할 코드를 위해 class import를 정의합니다:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as fs from 'fs';
import * as path from 'path';
```

이제, `APIGatewayStack` 클래스의 생성자에서 모듈 2에서 생성한 ECS 클러스터로부터 Network Load Balancer를 import 하겠습니다:

```typescript
const nlb = elbv2.NetworkLoadBalancer.fromNetworkLoadBalancerAttributes(this, 'NLB', {
  loadBalancerArn: props.loadBalancerArn,
});
```

그런 후 API Gateway를 위한 VPCLink를 정의하고 NLB를 VPCLink의 타겟으로 붙입니다:

```typescript
const vpcLink = new apigateway.VpcLink(this, 'VPCLink', {
  description: 'VPCLink for our REST API',
  vpcLinkName: 'TodoListApiVpcLink',
  targets: [
    nlb
  ]
});
```

이제 생성자 밑에 swagger 파일에 명시되어있는 API를 import할 헬퍼 함수를 작성하겠습니다:

```typescript
private generateSwaggerSpec(dnsName: string, userPoolId: string, vpcLink: apigateway.VpcLink): string {
  try {
    const schemaFilePath = path.resolve(__dirname + '/../../source/module-4/api/api-swagger.json');
    const apiSchema = fs.readFileSync(schemaFilePath);
    let schema: string = apiSchema.toString().replace(/REPLACE_ME_REGION/gi, cdk.Aws.REGION);
    schema = schema.toString().replace(/REPLACE_ME_ACCOUNT_ID/gi, cdk.Aws.ACCOUNT_ID);
    schema = schema.toString().replace(/REPLACE_ME_COGNITO_USER_POOL_ID/gi, userPoolId);
    schema = schema.toString().replace(/REPLACE_ME_VPC_LINK_ID/gi, vpcLink.vpcLinkId);
    schema = schema.toString().replace(/REPLACE_ME_NLB_DNS/gi, dnsName);
    return schema;
  } catch (exception) {
    throw new Error('Failed to generate swagger specification.  Please refer to the Module 4 readme for instructions.');
  }
}
```

마지막으로 생성자로 돌아가 API Gateway가 우리가 작성한 헬퍼 함수를 활용하도록 합니다:

```typescript
const schema = this.generateSwaggerSpec(props.loadBalancerDnsName, props.userPoolId, vpcLink);
const jsonSchema = JSON.parse(schema);
const api = new apigateway.CfnRestApi(this, 'Schema', {
  name: 'TodoListApi',
  body: jsonSchema,
  endpointConfiguration: {
    types: [
      apigateway.EndpointType.REGIONAL
    ]
  },
  failOnWarnings: true
});

const prod = new apigateway.CfnDeployment(this, 'Prod', {
    restApiId: api.ref,
    stageName: 'prod'
});

new cdk.CfnOutput(this, 'APIID', {
  value: api.ref,
  description: 'API Gateway ID'
})
```

완료 후 스택을 배포합니다:

```sh
cdk deploy TodoList-APIGateway
```

이를 통해 사용자 권한 부여가 가능한 REST API를 인터넷에 배포하고 사용 가능하게 됩니다. API는 다음 주소로 접근 가능합니다:

```sh
https://REPLACE_ME_WITH_API_ID.execute-api.REPLACE_ME_WITH_REGION.amazonaws.com/prod/todos
```

위의 주소를 복사하고 적절한 값으로 교체한 뒤 브라우저의 주소창에 입력합니다. TodoList JSON 응답을 다시 볼 수 있을 것입니다. 그러나 우리가 추가한 할일 완료 토글과 삭제 등의 추가 기능의 Flask 백엔드는 이미 구현되어 있습니다.

다음으로 웹사이트 업데이트를 처리해보겠습니다.

### TodoList 웹사이트 업데이트

새 버전의 TodoList 웹사이트는 사용자 등록과 로그인에 사용될 추가적인 HTML과 JavaScript 코드를 포함하고 있습니다. 이 코드는 AWS Cognito JavaScript SDK와 상호작용하여 필요한 모든 API 호출에 대한 등록, 인증 및 권한 부여 관리에 도움을 줍니다.

새 버전의 TodoList 웹사이트는 `web/` 디렉토리에 위치해 있습니다. 

#### API Gateway 엔드포인트 설정

먼저 배포된 API Gateway의 엔드포인트 URL을 확인해야 합니다. 위의 CDK 배포 출력에서 **APIID**를 확인하거나, 다음 명령어로 API Gateway ID를 검색할 수 있습니다:

```sh
aws apigateway get-rest-apis --query 'items[?name==`TodoListApi`][id]' --output text
```

API Gateway 엔드포인트 URL 형식은 다음과 같습니다:

```
https://[API_GATEWAY_ID].execute-api.[REGION].amazonaws.com/prod
```

> **참고:** 
> - `/prod`는 CDK 코드에서 `stageName: 'prod'`로 설정한 API 스테이지 이름입니다
> - 이는 API Gateway의 배포 환경(개발/스테이징/프로덕션 등)을 구분하는데 사용됩니다

예를 들어, API Gateway ID가 `9n4mdct5q3`이고 리전이 `ap-northeast-2`라면:
```
https://9n4mdct5q3.execute-api.ap-northeast-2.amazonaws.com/prod
```

#### 웹사이트 파일 설정

웹사이트 파일들의 `index.html`, `register.html`, `confirm.html` 파일을 열고, JavaScript 설정 부분에서 다음 값들을 업데이트합니다:

1. **`todosApiEndpoint`**: 위에서 확인한 API Gateway URL
2. **`cognitoUserPoolId`**: 이전에 저장한 Cognito User Pool ID
3. **`cognitoUserPoolClientId`**: 이전에 저장한 Cognito User Pool Client ID
4. **`awsRegion`**: 현재 AWS 리전

```javascript
// web/index.html, register.html, confirm.html 파일에서 설정
var todosApiEndpoint = 'https://9n4mdct5q3.execute-api.ap-northeast-2.amazonaws.com/prod';
var cognitoUserPoolId = 'ap-northeast-2_ZBFhksfKE';
var cognitoUserPoolClientId = '7df8hhrisaqu56im1ug8iddm3o';
var awsRegion = 'ap-northeast-2';
```

> **중요:** 
> - **NLB URL을 사용하지 마세요** (예: `http://todoli-servi-xxx.elb.amazonaws.com`)
> - **반드시 API Gateway URL을 사용해야 합니다** (CORS 및 인증 처리를 위해)

#### 웹사이트 파일 복사 및 배포

```sh
cd ../
cp -r source/module-4/web/* ./web
```

위에서 설명한 대로 웹 파일들을 수정한 후, S3 호스팅 웹사이트를 업데이트합니다:

```sh
cd cdk/
cdk deploy TodoList-Website
```

브라우저에서 TodoList 웹사이트를 새로고침하여 새로 추가된 기능들이 동작하는지 확인합니다!

### 테스트

1. CloudFront 배포 URL을 방문합니다
2. 새로운 사용자로 회원가입을 시도합니다  
3. 이메일 인증을 완료합니다
4. 로그인하여 할일 생성, 완료 토글, 삭제 기능을 테스트합니다

### 완료!

축하합니다! 이제 사용자 인증과 권한 부여가 포함된 완전한 TodoList 애플리케이션이 완성되었습니다.

주요 구현 사항:
- AWS Cognito를 통한 사용자 등록 및 인증
- API Gateway를 통한 REST API 엔드포인트 관리
- 인증이 필요한 기능 (할일 완료/삭제)에 대한 접근 제어
- 반응형 웹 UI

### CORS 문제 해결 (선택사항)

만약 웹 브라우저에서 할일 완료 토글이나 삭제 기능 사용 시 CORS 에러가 발생한다면, API Gateway에서 CORS 설정을 재적용해야 합니다.

**방법 1: AWS 콘솔에서 해결**
1. AWS 콘솔 → API Gateway → TodoListApi 선택
2. Actions → Enable CORS 클릭
3. 다음 설정으로 CORS 활성화:
   - Access-Control-Allow-Origin: `*`
   - Access-Control-Allow-Headers: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
   - Access-Control-Allow-Methods: `GET,POST,DELETE,OPTIONS`
4. "Enable CORS and replace existing CORS headers" 클릭
5. Actions → Deploy API → prod 스테이지에 배포

**방법 2: CDK 재배포로 해결**

CDK를 통해 API Gateway 스택을 재배포하여 CORS 설정을 확실히 적용:

```sh
cd cdk/
cdk deploy TodoList-APIGateway --require-approval never
```

재배포 후 브라우저에서 페이지를 새로고침하고 다시 테스트해보세요.

이것으로 모듈 4를 마치겠습니다.

[모듈 5 진행](../module-5/README.md)

## [AWS Developer Center](https://developer.aws)
