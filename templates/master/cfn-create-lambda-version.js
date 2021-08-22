module.exports = {
  "CreateLambdaVersionLambda": {
    "Type": "AWS::Lambda::Function",
    "Properties": {
      Code: {
        S3Bucket: { Ref: "BootstrapBucket" },
        S3Key: { "Fn::Sub": "${BootstrapPrefix}/lambda/cfn-create-lambda-version.zip" },
        S3ObjectVersion: { Ref: "CreateLambdaVersionCodeVersion" },
      },
      "Handler": "index.handler",
      "MemorySize": "1024",
      "Role": { "Fn::GetAtt": ["CreateLambdaVersionLambdaRole", "Arn"] },
      "Runtime": "nodejs12.x",
      "Timeout": 300,
      "TracingConfig": {
        "Fn::If": ["XRAYEnabled", { "Mode": "Active" },
          { "Ref": "AWS::NoValue" }]
      },

   "Tags": [{
        Key: "Type",
        Value: "Custom"
      }]
    }
  },
  CreateLambdaVersionCodeVersion: {
    Type: "Custom::S3Version",
    Properties: {
      ServiceToken: { "Fn::GetAtt": ["CFNLambda","Arn"] },
      Bucket: { Ref: "BootstrapBucket" },
      Key: { "Fn::Sub": "${BootstrapPrefix}/lambda/cfn-create-lambda-version.zip" },
      BuildDate: new Date().toISOString(),
    },
  },
  "CreateLambdaVersionLambdaRole": {
    "Type": "AWS::IAM::Role",
    "Properties": {
      "AssumeRolePolicyDocument": {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Service": [
                "lambda.amazonaws.com"
              ]
            },
            "Action": [
              "sts:AssumeRole"
            ]
          }
        ]
      },
      "Path": "/",
      "ManagedPolicyArns": [
        "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
      ],
      "Policies": [
        {
          "PolicyName": "LambdaExecutionPolicy",
          "PolicyDocument": {
            "Version": "2012-10-17",
            "Statement": [
              {
                "Effect": "Allow",
                "Action": [
                  "lambda:PublishVersion",
                  "lambda:UpdateAlias",
                  "lambda:CreateAlias",
                  "lambda:ListAliases"
                ],
                "Resource": [
                  "*"
                ]
              }
            ]
          }
        }
      ]
    }
  },
}