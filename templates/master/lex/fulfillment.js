var config = require('./config')
var _ = require('lodash')
var crypto = require('crypto')
var fs = require('fs')

var examples = _.fromPairs(require('../../examples/outputs')
  .names
  .map(x => {
    return [x, { "Fn::GetAtt": ["ExamplesStack", `Outputs.${x}`] }]
  }))
var responsebots = _.fromPairs(require('../../examples/examples/responsebots-lexv2')
  .names
  .map(x => {
    return [x, { "Fn::GetAtt": ["ExamplesStack", `Outputs.${x}`] }]
  }))

const filfillmentZip = (fs.existsSync("../../build/lambda/fulfillment.zip") ? "../../" : "./") + "build/lambda/fulfillment.zip"; 
const fulfillmentZipDate =  fs.statSync(filfillmentZip).mtime.toISOString()
const fulfillmentZipDateHash = crypto.createHash("sha256").update(fulfillmentZipDate).digest("hex")

const esProxyLayerZip = (fs.existsSync("../../build/lambda/es-proxy-layer.zip") ? "../../" : "./") + "build/lambda/es-proxy-layer.zip";
const esProxyLayerZipDate = fs.statSync(esProxyLayerZip).mtime.toISOString()
const esProxyLayerZipDateHash = crypto.createHash("sha256").update(esProxyLayerZipDate).digest("hex")

const commonModuleLayerZip = (fs.existsSync("../../build/lambda/common-modules-layer.zip") ? "../../" : "./") + "build/lambda/common-modules-layer.zip";
const commonModulesDate = fs.statSync(commonModuleLayerZip).mtime.toISOString()
const commonModulesDateHash = crypto.createHash("sha256").update(commonModulesDate).digest("hex")

const awsSdkLayerZip = (fs.existsSync("../../build/lambda/aws-sdk-layer.zip") ? "../../" : "./") + "build/lambda/aws-sdk-layer.zip";
const awsSdkLayerZipDate = fs.statSync(awsSdkLayerZip).mtime.toISOString()
const awsSdkZipDateHash = crypto.createHash("sha256").update(awsSdkLayerZipDate).digest("hex")

const fulfillmentHash =  crypto.createHash("sha256").update(fulfillmentZipDateHash + esProxyLayerZipDateHash + awsSdkZipDateHash + commonModulesDateHash).digest("hex")

module.exports = {
  "Alexa": {
    "Type": "AWS::Lambda::Permission",
    "DependsOn": "FulfillmentLambdaAliaslive",
    "Properties": {
      "Action": "lambda:InvokeFunction",
      "FunctionName": {  "Fn::Join": [ ":", [
        {"Fn::GetAtt":["FulfillmentLambda","Arn"]}, 
        "live"
      ]]},
      "Principal": "alexa-appkit.amazon.com"
    }
  },
  "FulfillmentCodeVersion": {
    "Type": "Custom::S3Version",
    "Properties": {
      "ServiceToken": { "Fn::GetAtt": ["CFNLambda", "Arn"] },
      "Bucket": { "Ref": "BootstrapBucket" },
      "Key": { "Fn::Sub": "${BootstrapPrefix}/lambda/fulfillment.zip" },
      "BuildDate": (new Date()).toISOString()
    }
  },
  "FulfillmentLambda": {
    "Type": "AWS::Serverless::Function",
    "DependsOn": "FulfillmentCodeVersion",
    "Properties": {
      "AutoPublishAlias":"live",
      "AutoPublishCodeSha256": fulfillmentHash,
      "CodeUri": {
        "Bucket": { "Ref": "BootstrapBucket" },
        "Key": { "Fn::Sub": "${BootstrapPrefix}/lambda/fulfillment.zip" },
        "Version": { "Ref": "FulfillmentCodeVersion" }
      },
      "Environment": {
        "Variables": Object.assign({
          ES_TYPE: { "Fn::GetAtt": ["Var", "QnAType"] },
          ES_INDEX: { "Fn::GetAtt": ["Var","QnaIndex"] },
          ES_ADDRESS: { "Fn::GetAtt": ["ESVar", "ESAddress"] },
          LAMBDA_DEFAULT_QUERY: { "Ref": "ESQueryLambda" },
          LAMBDA_LOG: { "Ref": "ESLoggingLambda" },
          ES_SERVICE_QID: { "Ref": "ESQidLambda" },
          ES_SERVICE_PROXY: { "Ref": "ESProxyLambda" },
          DYNAMODB_USERSTABLE: { "Ref": "UsersTable" },
          DEFAULT_USER_POOL_JWKS_PARAM: { "Ref": "DefaultUserPoolJwksUrl" },
          DEFAULT_SETTINGS_PARAM: { "Ref": "DefaultQnABotSettings" },
          CUSTOM_SETTINGS_PARAM: { "Ref": "CustomQnABotSettings" },
        }, examples, responsebots)
      },
      "Handler": "index.handler",
      "MemorySize": 1408,
      "ProvisionedConcurrencyConfig": {
        "Fn::If": [ "CreateConcurrency", {
          "ProvisionedConcurrentExecutions" : {"Ref": "FulfillmentConcurrency"}
        }, {"Ref" : "AWS::NoValue"} ]
      },
      "Role": { "Fn::GetAtt": ["FulfillmentLambdaRole", "Arn"] },
      "Runtime": "nodejs12.x",
      "Timeout": 300,
      "VpcConfig" : {
        "Fn::If": [ "VPCEnabled", {
          "SubnetIds": {"Ref": "VPCSubnetIdList"},
          "SecurityGroupIds": {"Ref": "VPCSecurityGroupIdList"}
        }, {"Ref" : "AWS::NoValue"} ]
      },
      "Tracing" : {
        "Fn::If": [ "XRAYEnabled", "Active",
          "PassThrough" ]
      },
      "Layers":[{"Ref":"AwsSdkLayerLambdaLayer"},
                {"Ref":"CommonModulesLambdaLayer"},
                {"Ref":"EsProxyLambdaLayer"}],
      "Tags": {
        "Type": "Fulfillment"
      }
    }
  },
  "InvokePolicy": {
    "Type": "AWS::IAM::ManagedPolicy",
    "Properties": {
      "PolicyDocument": {
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Action": [
            "lambda:InvokeFunction"
          ],
          "Resource": [
            "arn:aws:lambda:*:*:function:qna-*",
            "arn:aws:lambda:*:*:function:QNA-*",
            { "Fn::GetAtt": ["ESQueryLambda", "Arn"] },
            { "Fn::GetAtt": ["ESProxyLambda", "Arn"] },
            { "Fn::GetAtt": ["ESLoggingLambda", "Arn"] },
            { "Fn::GetAtt": ["ESQidLambda", "Arn"] },
          ].concat(require('../../examples/outputs').names
            .map(x => {
              return { "Fn::GetAtt": ["ExamplesStack", `Outputs.${x}`] }
            }))
        }]
      },
      "Roles": [{ "Ref": "FulfillmentLambdaRole" }]
    }
  },
  "LexBotPolicy": {
    "Type": "AWS::IAM::ManagedPolicy",
    "Properties": {
      "PolicyDocument": {
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Action": [
            "lex:PostText",
            "lex:RecognizeText"
          ],
          "Resource": [
            "arn:aws:lex:*:*:bot:QNA*",
            "arn:aws:lex:*:*:bot*",
          ]
        }]
      },
      "Roles": [{ "Ref": "FulfillmentLambdaRole" }]
    }
  },
  "FulfillmentLambdaRole": {
    "Type": "AWS::IAM::Role",
    "Properties": {
      "AssumeRolePolicyDocument": {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
          }
        ]
      },
      "Path": "/",
      "ManagedPolicyArns": [
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
        "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess",
        "arn:aws:iam::aws:policy/TranslateReadOnly",
        "arn:aws:iam::aws:policy/ComprehendReadOnly",
        { "Ref": "QueryPolicy" }
      ],
      "Policies": [
        {
          "PolicyName": "ParamStorePolicy",
          "PolicyDocument": {
            "Version": "2012-10-17",
            "Statement": [{
              "Effect": "Allow",
              "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters"
              ],
              "Resource": [
                {
                  "Fn::Join": [
                    "", [
                      "arn:aws:ssm:",
                      { "Fn::Sub": "${AWS::Region}:" },
                      { "Fn::Sub": "${AWS::AccountId}:" },
                      "parameter/",
                      { "Ref": "DefaultQnABotSettings" }
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "", [
                      "arn:aws:ssm:",
                      { "Fn::Sub": "${AWS::Region}:" },
                      { "Fn::Sub": "${AWS::AccountId}:" },
                      "parameter/",
                      { "Ref": "CustomQnABotSettings" }
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "", [
                      "arn:aws:ssm:",
                      { "Fn::Sub": "${AWS::Region}:" },
                      { "Fn::Sub": "${AWS::AccountId}:" },
                      "parameter/",
                      { "Ref": "DefaultUserPoolJwksUrl" }
                    ]
                  ]
                }
              ]
            }]
          }
        },
        {
          "PolicyName": "DynamoDBPolicy",
          "PolicyDocument": {
            "Version": "2012-10-17",
            "Statement": [{
              "Effect": "Allow",
              "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
              ],
              "Resource": [
                { "Fn::GetAtt": ["UsersTable", "Arn"] }
              ]
            }]
          }
        },
        { 
          "PolicyName" : "S3QNABucketReadAccess",
          "PolicyDocument" : {
          "Version": "2012-10-17",
            "Statement": [
              {
                  "Effect": "Allow",
                  "Action": [
                      "s3:GetObject"
                   ],   
                  "Resource": [
                      "arn:aws:s3:::QNA*/*",
                      "arn:aws:s3:::qna*/*"
                  ]
              }
            ]
          }
        }
      ]
    }
  },
  "ESWarmerLambda": {
    "Type": "AWS::Lambda::Function",
    "Properties": {
      "Code": {
        "S3Bucket": { "Ref": "BootstrapBucket" },
        "S3Key": { "Fn::Sub": "${BootstrapPrefix}/lambda/fulfillment.zip" },
        "S3ObjectVersion": { "Ref": "FulfillmentCodeVersion" }
      },
      "Environment": {
        "Variables": Object.assign({
          REPEAT_COUNT:  "4",
          TARGET_PATH: "_doc/_search",
          TARGET_INDEX: { "Fn::GetAtt": ["Var","QnaIndex"] },
          TARGET_URL: { "Fn::GetAtt": ["ESVar", "ESAddress"] },
          DEFAULT_SETTINGS_PARAM: { "Ref": "DefaultQnABotSettings" },
          CUSTOM_SETTINGS_PARAM: { "Ref": "CustomQnABotSettings" },
        })
      },
      "Handler": "index.warmer",
      "MemorySize": "512",
      "Role": { "Fn::GetAtt": ["WarmerLambdaRole", "Arn"] },
      "Runtime": "nodejs12.x",
      "Timeout": 300,
      "Layers": [
        {"Ref": "AwsSdkLayerLambdaLayer"},
        {"Ref": "CommonModulesLambdaLayer"},
        {"Ref": "EsProxyLambdaLayer"}
      ],
      "VpcConfig" : {
        "Fn::If": [ "VPCEnabled", {
          "SubnetIds": {"Ref": "VPCSubnetIdList"},
          "SecurityGroupIds": {"Ref": "VPCSecurityGroupIdList"}
        }, {"Ref" : "AWS::NoValue"} ]
      },
      "TracingConfig" : {
        "Fn::If": [ "XRAYEnabled", {"Mode": "Active"},
          {"Ref" : "AWS::NoValue"} ]
      },
      "Tags": [{
        Key: "Type",
        Value: "Warmer"
      }]
    }
  },
  "WarmerLambdaRole": {
    "Type": "AWS::IAM::Role",
    "Properties": {
      "AssumeRolePolicyDocument": {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
          }
        ]
      },
      "Path": "/",
      "ManagedPolicyArns": [
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
        "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
      ],
      "Policies": [
        {
          "PolicyName": "ParamStorePolicy",
          "PolicyDocument": {
            "Version": "2012-10-17",
            "Statement": [{
              "Effect": "Allow",
              "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters"
              ],
              "Resource": [
                {
                  "Fn::Join": [
                    "", [
                      "arn:aws:ssm:",
                      { "Fn::Sub": "${AWS::Region}:" },
                      { "Fn::Sub": "${AWS::AccountId}:" },
                      "parameter/",
                      { "Ref": "DefaultQnABotSettings" }
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "", [
                      "arn:aws:ssm:",
                      { "Fn::Sub": "${AWS::Region}:" },
                      { "Fn::Sub": "${AWS::AccountId}:" },
                      "parameter/",
                      { "Ref": "CustomQnABotSettings" }
                    ]
                  ]
                }
              ]
            },
              {
              "Sid": "AllowES",
              "Effect": "Allow",
              "Action": [
                "es:ESHttpGet",
              ],
              "Resource": [
                "*"
              ]
            }]
          }
        }
      ]
    }
  },
  "ESWarmerRule": {
    "Type": "AWS::Events::Rule",
    "Properties": {
      "ScheduleExpression": "rate(1 minute)",
      "Targets": [
        {
          "Id": "ESWarmerScheduler",
          "Arn": {
            "Fn::GetAtt": [
              "ESWarmerLambda",
              "Arn"
            ]
          }
        }
      ]
    }
  },
  "ESWarmerRuleInvokeLambdaPermission": {
    "Type": "AWS::Lambda::Permission",
    "Properties": {
      "FunctionName": {
        "Fn::GetAtt": [
          "ESWarmerLambda",
          "Arn"
        ]
      },
      "Action": "lambda:InvokeFunction",
      "Principal": "events.amazonaws.com",
      "SourceArn": {
        "Fn::GetAtt": [
          "ESWarmerRule",
          "Arn"
        ]
      }
    }
  }
}

