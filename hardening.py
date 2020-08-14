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
    args.stack_arn = 'QNA-dev-dev-master-1'
    args.cmk_arn = "arn:aws:kms:us-east-1:123456790:key/AAAAAAA"

policy_document = {
    "Version":"2012-10-17",
    "Statement":[
        {
            "Effect":"Allow",
            "Action":"kms:Decrypt",
            "Resource":args.cmk_arn
        }
    ]
}


def process_stacks(stackname):
    # Get all of the lambda resources from the QnABot stack
    paginator = cloudformation_client.get_paginator('list_stack_resources')
    response_iterator = paginator.paginate(
        StackName=stackname,
        PaginationConfig={
            'MaxItems': 10000#,
        }
    )

    role_paginator = iam_client.get_paginator('list_role_policies')

    for response in response_iterator:
        lambda_resources = filter(lambda x: x["ResourceType"] == "AWS::Lambda::Function",response["StackResourceSummaries"])
        

        for lambda_func in lambda_resources:
            lambda_client.update_function_configuration(FunctionName=lambda_func["PhysicalResourceId"],KMSKeyArn=args.cmk_arn)
            print(f"Updated function {lambda_func} in stack {stackname}")
            
            lambda_configuration = lambda_client.get_function_configuration(FunctionName=lambda_func["PhysicalResourceId"])
            role_name = lambda_configuration["Role"].split("/")[-1]

            role_iterator = role_paginator.paginate(
                RoleName=role_name,
                PaginationConfig={
                    'MaxItems': 1000,
                    'PageSize': 1000
                }
            )

            cmk_policy_exists = False
            for role in role_iterator:
                if "CMKPolicy" in role["PolicyNames"]:
                    cmk_policy_exists = True
                    break

            if not cmk_policy_exists:
                iam_client.put_role_policy(RoleName=role_name, PolicyName = "CMKPolicy",PolicyDocument=json.dumps(policy_document))






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








    



    


        






