var fs=require('fs')

module.exports=Object.assign(
    {
    // "CloudWatchEventsBackupTrigger":{
    //   "Type" : "AWS::Events::Rule",
    //   "Properties" : {
    //     "Description" : "Triggers QnABot scheduled Backup",
    //     "ScheduleExpression" : "cron(0/5 * * * ? *)",
    //     "State" : "ENABLED",
    //     "Targets" : [{"Arn" : {"Fn::GetAtt":["AutomatedBackupLambda","Arn"]},
    //                     "Id" : {"Fn::Join":["",["QnABot-Backup-","AWS::StackName"]]},
    //                     "RoleArn" : {"Fn::GetAtt":["CloudWatchEventsBackupRole","Arn"]},}]
    //   }
    // },
    // "CloudWatchEventsBackupRole":{
    //   "Type": "AWS::IAM::Role",
    //   "Properties": {
    //     "AssumeRolePolicyDocument": { 
    //       "Version":"2012-10-17",
    //       "Statement":[
    //         {
    //           "Effect":"Allow",
    //           "Principal":{
    //             "Service":"events.amazonaws.com"
    //           },
		//		         "Action": "sts:AssumeRole"
    //         }
    //       ]
    //     },
    //     "Path": "/",
    //     "ManagedPolicyArns": [{"Ref":"CWAccessPolicy"}]
    //   }
    // },
    // "CWAccessPolicy":{
    //   "Type": "AWS::IAM::ManagedPolicy",
    //   "Properties": {
    //     "PolicyDocument": {
    //       "Version": "2012-10-17",
    //       "Statement": [{
    //           "Effect": "Allow",
    //           "Action": [
    //             "lambda:InvokeFunction"
    //           ],
    //           "Resource":{"Fn::GetAtt": ["AutomatedBackupLambda","Arn"]} 
    //         }]
    //     }
    //   }
    // }
    // "AutomatedESBackupCodeVersion":{
    //     "Type": "Custom::S3Version",
    //     "Properties": {
    //         "ServiceToken": { "Fn::GetAtt" : ["CFNLambda", "Arn"] },
    //         "Bucket": {"Ref":"BootstrapBucket"},
    //         "Key": {"Fn::Sub":"${BootstrapPrefix}/lambda/automated-es-backup.zip"},
    //         "BuildDate":(new Date()).toISOString()
    //     }
    // },
    // "AutomatedBackupLambda": {
    //   "Type": "AWS::Lambda::Function",
    //   "Properties": {
    //     "Code": {
    //         "S3Bucket": {"Ref":"BootstrapBucket"},
    //         "S3Key": {"Fn::Sub":"${BootstrapPrefix}/lambda/automated-es-backup.zip"},
    //         "S3ObjectVersion":{"Ref":"AutomatedESBackupCodeVersion"}
    //     },
    //     "Environment": {
    //         "Variables": {
    //             ES_INDEX:{"Fn::GetAtt":["Var","index"]},
    //             EXPORTS_BUCKET:{"Ref":"ExportBucket"},
    //         }
    //     },
    //     "Handler": "index.handler",
    //     "MemorySize": "128",
    //     "Role": {"Fn::GetAtt": ["ExportRole","Arn"]},
    //     "Runtime": "nodejs8.10",
    //     "Timeout": 300,
    //     "Tags":[{
    //         Key:"Type",
    //         Value:"Backup"
    //     }]
    //   }
    // }
})

