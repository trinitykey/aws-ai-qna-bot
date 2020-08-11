import boto3
import argparse
import json
import base64


parser = argparse.ArgumentParser(description='Uses a specified CMK to encrypt QnABot Lambdas and Parameter Store settings')
parser.add_argument("stack_arn", help="the arn of the QnABot CloudFormation Stack")
parser.add_argument("cmk_arn", help="the ARN of the Customer Master Key to use for encryption")
args = parser.parse_args()



# Get all of the lambda resources from the QnABot stack

lambda_resources = []
cloudformation_client = boto3.client('cloudformation')
response = []
while True:
    if 'NextToken' in response:
        response = cloudformation_client.list_stack_resources(Stackname = args.stack_arn,NextToken=response['NextToken'])
    else:
        response = cloudformation_client.list_stack_resources(Stackname = args.stack_arn)
    lambda_resources.append(filter(lambda x: x == "AWS::Lambda::Function",response["StackResourceSummaries"]))
    if 'NextToken' not in response:
        break

 

# Add the cmk role to each Lambda and 
lambda_client = boto3.client('lambda')
iam_client = boto3.client('iam')
policy_document = {
    "Version":"2012-10-17",
    "Statement":[
        {
            "Effect":"Allow",
            "Action":"kms:Decrypt"
            "Resource":parser.cmk_arn
        }
    ]
}

for lambda_func in lambdas:
    lambda_configuration = lambda_client.get_function_configuration(FunctionName=lambda_func["Properties"]["FunctionName"])
    role = lambda_configuration["Role"]
    response =  iam_client.list_role_policies(RoleName=role)
    cmk_policy_exists = False

    ## Add the CMK Policy to the response if it doesn't exist
    while True:
        if "IsTruncated" in response:
            response = iam_client.list_role_policies(RoleName=role,Marker=response["Marker"])
        else:
            response =  iam_client.list_role_policies(RoleName=role)
        if "CMKPolicy" in response["PolicyNames"]:
            cmk_policy_exists = True
            break
        if "IsTruncated" not in response:
            break
    
    if Not cmk_policy_exists:
        iam_client.put_role_policy(RoleName=role, PolicyName = "CMKPolicy",PolicyDocument=json.dumps(policy_document))
    
    # Add the CMK to the lambda and encrypt the parameters
    lambda_client.update_function_configuration(FunctionName=lambda_func["Properties"]["FunctionName"],KMSKeyArn=parser.cmk_arn)

 ## Encrypt each environment variable using the CMK and store it in a dictionary 
 ## - aws kms encrypt --key-id {key_id} --plaintext  {variable value}  # Be sure Base64 is working correctly
    env_variables = lambda_configuration["Environment"]["Variables"]
    encrypted_variables = []
    ##TODO Test to see if environment variable is already encrypted
    for variable in env_variables:
        response = client.encrypt(KeyId=parser.cmk_arn,Plaintext=env_variables[variable])
        encrypted_text = response["CyphertextBlob"]
        encrypted_variables.append({
            variable:encrypted_text
        })
    
    if len(encrypted_variables) > 0:
            lambda_client.update_function_configuration(FunctionName=lambda_func["Properties"]["FunctionName"],
            Environment = {
                "Variables":encrypted_variables
            })





    


        






