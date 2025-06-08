# AWS CDK를 이용한 aws 애플리케이션 구축 실습

이 프로젝트는 AWS CDK를 사용하여 현대적인 웹 애플리케이션을 구축하는 실습 프로젝트입니다. AWS의 다양한 서비스를 활용하여 마이크로서비스 아키텍처를 구현하고, 인프라를 코드로 관리하는 방법을 학습합니다.
모든 내용은 최대한 복사 붙여넣기를 할 수 있도록 작성되었습니다.
혹시나 오류가 발생하면 저에게 문의주시면 감사드리겠습니다.

## 개발 환경 준비

해당 프로젝트는 다음 환경들이 설치되어 있어야 합니다.
꼭 버전이 맞아야 하는건 아니지만 aws-cli는 꼭 2버전입니다.

- [Python 3.13](https://www.python.org/downloads/)
- [Node.js 20.x](https://nodejs.org/ko)
- [Docker Desktop](https://www.docker.com/)
  
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

> (1분)

```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

- [AWS CDK](https://docs.aws.amazon.com/ko_kr/cdk/v2/guide/getting-started.html)

> (30초)

```bash
npm install -g aws-cdk
```

```bash
# AWS CLI 버전 확인
aws --version
# 출력: aws-cli/2.27.26 Python/3.13.3 Windows/11 exe/AMD64

# Node.js 버전 확인
node -v
# 출력: v20.18.0

# npm 버전 확인
npm -v
# 출력: 10.9.0

# Python 버전 확인
python --version
# 출력: Python 3.13.0

# AWS CDK 버전 확인
cdk --version
# 출력: 2.1017.1 (build 60506e5)
```

## 프로젝트 구조

```
.
├── source/                   # AWS 워크샵 예제 소스 코드
│   ├── module-1/             # 모듈 1: 기본 인프라 설정
│   ├── module-2/             # 모듈 2: Flask 애플리케이션 및 Fargate 배포
│   └── ...
├── cdk/                      # cdk 소스 코드
├── web/                      # 웹 소스 코드
├── app/                      # 애플리케이션 소스 코드
```

## 주의사항

- AWS 계정과 관리자 권한이 필요합니다
- 일부 AWS 서비스는 비용이 발생할 수 있습니다
- 실습 완료 후 생성된 리소스는 반드시 삭제해야 합니다

## 원본 출처

- [AWS sample](https://github.com/aws-samples/aws-modern-application-workshop)


[모듈 0 진행](source/module-0/README.md)
