
# the user running the script must have permission to use the CMK
# create the following policy aws iam create-policy --policy-name qna-bot-cmk-policy  --policy-document file://policy.json --profile LeastPrivileged
# {
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#       "Effect": "Allow",
#       "Action": "kms:Decrypt",
#       "Resource": "arn:aws:kms:ap-southeast-2:123456789012:key/8268a548-267e-4755-b5ca-e104a848c134"
#     }
#   ]
# }
# get stackname and cmk from command line cloudformation list-stack-resources
# filter on lambdas
# for each lambda get the role -- get-function-configuration
## add policy to role  ### aws iam put-role-policy --role-name {RoleName}  --policy-name qna-bot-cmk-policy  --policy-document file://policy.json --profile LeastPrivileged
## add cmk to lambda  aws lambda update-function-configuration --function-name function --kms-key-arn {key_arm} --region us-east-1 
## Encrypt each environment variable using the CMK and store it in a dictionary - aws kms encrypt --key-id {key_id} --plaintext  {variable value}  # Be sure Base64 is working correctly
## 

{
            "ES_INDEX": "qna-dev-dev-master-4",
            "ES_ADDRESS": "search-qna-dev-elasti-bbli8kisgmzu-m6fy2zahvhvigijyb4hthadzo4.us-east-1.es.amazonaws.com"
        }

