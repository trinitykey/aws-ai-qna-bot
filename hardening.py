import boto3
import argparse
import json
import base64


parser = argparse.ArgumentParser(description='Uses a specified CMK to encrypt QnABot Lambdas and Parameter Store settings')
parser.add_argument("stack_arn", help="the arn of the QnABot CloudFormation Stack")
parser.add_argument("cmk_arn", help="the ARN of the Customer Master Key to use for encryption")

lambda_client = boto3.client('lambda')
iam_client = boto3.client('iam')
kms_client = boto3.client("kms")
cloudformation_client = boto3.client('cloudformation')

args = type('', (), {})()

if __name__ != "__main__":
    args = parser.parse_args()
else:
    args.stack_arn = 'QNA-dev-dev-master-4'
    args.cmk_arn = "arn:aws:kms:us-east-1:1234567890:key/1234567890"



def process_stacks(stackname):
    # Get all of the lambda resources from the QnABot stack
    paginator = cloudformation_client.get_paginator('list_stack_resources')
    response_iterator = paginator.paginate(
        StackName=stackname,
        PaginationConfig={
            'MaxItems': 10000#,
        }
    )

    for response in response_iterator:
        lambda_resources = filter(lambda x: x["ResourceType"] == "AWS::Lambda::Function",response["StackResourceSummaries"])
        

        for lambda_func in lambda_resources:

            lambda_client.update_function_configuration(FunctionName=lambda_func["PhysicalResourceId"],KMSKeyArn=args.cmk_arn)


process_stacks(args.stack_arn)

paginator = cloudformation_client.get_paginator('list_stack_resources')
response_iterator = paginator.paginate(
    StackName=args.stack_arn,
    PaginationConfig={
        'MaxItems': 10000,
    }
)
for response in response_iterator:
    stacks = filter(lambda x: x["ResourceType"] == "AWS::CloudFormation::Stack",response["StackResourceSummaries"])
    for stack in stacks:
        print(f"Processing stack {stack}")
        process_stacks(stack["PhysicalResourceId"])






    



    


        






