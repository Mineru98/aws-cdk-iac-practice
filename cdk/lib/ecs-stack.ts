import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as iam from "aws-cdk-lib/aws-iam";

interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  ecrRepository: ecr.Repository;
}

export class EcsStack extends cdk.Stack {
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecsService: ecsPatterns.NetworkLoadBalancedFargateService;

  constructor(scope: cdk.App, id: string, props: EcsStackProps) {
    super(scope, id);

    this.ecsCluster = new ecs.Cluster(this, "Cluster", {
      clusterName: "TodoList-Cluster",
      vpc: props.vpc,
    });

    this.ecsCluster.connections.allowFromAnyIpv4(ec2.Port.tcp(8080));

    this.ecsService = new ecsPatterns.NetworkLoadBalancedFargateService(
      this,
      "Service",
      {
        // ECS 클러스터 지정 - 컨테이너들이 실행될 논리적 그룹
        cluster: this.ecsCluster,
        // 실행할 태스크(컨테이너) 개수 - 1개면 단일 인스턴스, 2개 이상이면 고가용성
        desiredCount: 1,
        // 로드밸런서를 인터넷에 노출할지 여부 - true면 외부에서 접근 가능
        publicLoadBalancer: true,
        // 컨테이너 실행 관련 상세 설정
        taskImageOptions: {
          // CloudWatch 로그 활성화 - 컨테이너 로그를 AWS에서 확인 가능
          enableLogging: true,
          // 컨테이너 이름 - ECS 콘솔에서 보이는 이름
          containerName: "TodoList-Service",
          // 컨테이너가 리스닝하는 포트 - Flask 앱이 8080 포트 사용
          containerPort: 8080,
          // 사용할 Docker 이미지 - ECR 리포지토리에서 latest 태그 자동 선택
          image: ecs.ContainerImage.fromEcrRepository(props.ecrRepository),
        },
      }
    );

    this.ecsService.service.connections.allowFrom(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(8080)
    );

    const taskDefinitionPolicy = new iam.PolicyStatement();
    taskDefinitionPolicy.addActions(
      // ECS가 awsvpc 네트워킹 모드를 위해 네트워크 인터페이스를 관리할 수 있도록 하는 권한
      "ec2:AttachNetworkInterface", // 네트워크 인터페이스 연결
      "ec2:CreateNetworkInterface", // 네트워크 인터페이스 생성
      "ec2:CreateNetworkInterfacePermission", // 네트워크 인터페이스 권한 생성
      "ec2:DeleteNetworkInterface", // 네트워크 인터페이스 삭제
      "ec2:DeleteNetworkInterfacePermission", // 네트워크 인터페이스 권한 삭제
      "ec2:Describe*", // EC2 리소스 정보 조회
      "ec2:DetachNetworkInterface", // 네트워크 인터페이스 분리

      // ECS가 로드밸런서를 관리하고 트래픽을 컨테이너로 라우팅하기 위한 권한
      "elasticloadbalancing:DeregisterInstancesFromLoadBalancer", // 로드밸런서에서 인스턴스 해제
      "elasticloadbalancing:DeregisterTargets", // 타겟 그룹에서 타겟 해제
      "elasticloadbalancing:Describe*", // 로드밸런서 정보 조회
      "elasticloadbalancing:RegisterInstancesWithLoadBalancer", // 로드밸런서에 인스턴스 등록
      "elasticloadbalancing:RegisterTargets", // 타겟 그룹에 타겟 등록

      // ECS가 IAM 역할이 할당된 태스크를 실행할 수 있도록 하는 권한
      "iam:PassRole",

      // ECS가 CloudWatch에 로그를 생성하고 전송할 수 있도록 하는 권한
      "logs:DescribeLogStreams", // 로그 스트림 정보 조회
      "logs:CreateLogGroup" // 로그 그룹 생성
    );
    taskDefinitionPolicy.addAllResources();

    // 실행 역할(Execution Role)에 정책 추가 - ECS 서비스가 컨테이너를 시작하기 위한 권한
    this.ecsService.service.taskDefinition.addToExecutionRolePolicy(
      taskDefinitionPolicy
    );

    const taskRolePolicy = new iam.PolicyStatement();
    taskRolePolicy.addActions(
      // ECS 태스크가 ECR에서 Docker 이미지를 다운로드할 수 있도록 하는 권한
      "ecr:GetAuthorizationToken", // ECR 인증 토큰 획득
      "ecr:BatchCheckLayerAvailability", // 이미지 레이어 가용성 확인
      "ecr:GetDownloadUrlForLayer", // 이미지 레이어 다운로드 URL 획득
      "ecr:BatchGetImage", // 이미지 매니페스트 정보 획득

      // ECS 태스크가 CloudWatch에 로그를 업로드할 수 있도록 하는 권한
      "logs:CreateLogStream", // 로그 스트림 생성
      "logs:CreateLogGroup", // 로그 그룹 생성
      "logs:PutLogEvents" // 로그 이벤트 전송
    );
    taskRolePolicy.addAllResources();

    // 태스크 역할(Task Role)에 정책 추가 - 컨테이너 내부에서 AWS 서비스에 접근하기 위한 권한
    this.ecsService.service.taskDefinition.addToTaskRolePolicy(taskRolePolicy);
  }
}
