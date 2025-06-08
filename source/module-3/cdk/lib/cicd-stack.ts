import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';

interface CiCdStackProps extends cdk.StackProps {
  ecrRepository: ecr.Repository;
  ecsService: ecs.FargateService;
}

export class CiCdStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: CiCdStackProps) {
    super(scope, id);

    // GitHub Personal Access Token 가져오기
    const githubToken = cdk.SecretValue.secretsManager('github-token');

    // CodeBuild 프로젝트 생성
    const codebuildProject = new codebuild.PipelineProject(this, "BuildProject", {
      projectName: "TodoListServiceCodeBuildProject",
      environment: {
        computeType: codebuild.ComputeType.SMALL,
        buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
        privileged: true,
        environmentVariables: {
          AWS_ACCOUNT_ID: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Aws.ACCOUNT_ID
          },
          AWS_DEFAULT_REGION: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cdk.Aws.REGION
          }
        }
      }
    });

    // ECR 리포지토리에 대한 권한 부여
    props.ecrRepository.grantPullPush(codebuildProject.grantPrincipal);

    // 소스 액션 정의 (GitHub)
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new actions.GitHubSourceAction({
      actionName: "GitHub-Source",
      owner: 'dev-coo',           // ← 실제 GitHub 사용자명으로 변경
      repo: 'todolist-backend',
      branch: 'main',
      oauthToken: githubToken,
      output: sourceOutput
    });

    // 빌드 액션 정의
    const buildOutput = new codepipeline.Artifact();
    const buildAction = new actions.CodeBuildAction({
      actionName: "Build",
      input: sourceOutput,
      outputs: [buildOutput],
      project: codebuildProject
    });

    // 배포 액션 정의
    const deployAction = new actions.EcsDeployAction({
      actionName: "DeployAction",
      service: props.ecsService,
      input: buildOutput
    });

    // 파이프라인 생성
    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: "TodoListPipeline"
    });

    // 파이프라인 스테이지 추가
    pipeline.addStage({
      stageName: "Source",
      actions: [sourceAction]
    });

    pipeline.addStage({
      stageName: "Build",
      actions: [buildAction]
    });

    pipeline.addStage({
      stageName: "Deploy",
      actions: [deployAction]
    });
  }
}