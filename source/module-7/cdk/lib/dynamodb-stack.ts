import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class CognitoStack extends cdk.Stack {

  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  
  constructor(scope: cdk.App, id: string) {
    super(scope, id);
    
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'MysfitsUserPool',
      selfSignUpEnabled: true,
      autoVerify: {
        email: true
      }
    });
    
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'MysfitsUserPoolClient'
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