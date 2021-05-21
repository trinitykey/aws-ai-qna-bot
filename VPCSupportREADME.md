# VPC Support - Preview Mode
(version 1.0 - December 2020)

QnABot now provides in Preview Mode deployment using a VPC. 

### Requirements

In order for deployment of resources attaching within a VPC two requirements
must be met.

1) A fully functioning VPC with a minimum of two private subnets spread over two availability zones is required. In addition
2) A pre-configured VPC security group that 
    1) allows inbound connections on port 443 from other addresses in the VPC CIDR block. For example,
       if the VPC's CIDR block is 10.178.0.0/16, inbound connections in the security
       group should be allowed from this CIDR block.
    2) allows outbound connections to 0.0.0.0.
   
### Deployment
Deploying Elasticsearch cluster into a VPC requires creating a service linked role for es. You can execute the following command
using credentials for the target account.

```
aws iam create-service-linked-role --aws-service-name es.amazonaws.com
```
A new template has been created that supports deployment within a VPC named public-vpc-support.json. You'll find this template
alongside the public.json template. In us-east-1 this S3 location would be
```
https://aws-bigdata-blog.s3.amazonaws.com/artifacts/aws-ai-qna-bot/templates/public-vpc-support.json
```
Launch from this template instead of the public.json template. 

**Note: Once QnABot has been deployed with or without VPC, the installation can't be switched. It needs
to stay in VPC or out of VPC as first configured and can't be switched between the two. 
To switch to a different mode, you would need to perform a fresh install.**

Two new parameters are required when deploying within a VPC

Select a pre-configured security group. This security group must enables inbound communication to 
the Elasticsearch cluster on port 443. 

Select a minimum of two Private Subnets spread over two availability zones. These private
subnets must have NAT configured to allow communication to other AWS services. Do not
attempt to use public subnets.

Once these are configured, launch the template.

### Behavior of the system after deployment

* This template attaches the Elasticsearch cluster and Lambdas to the private subnets. Communication
between these components occurs within the VPC.

* The Kibana dashboard provided within the Elasticsearch cluster is only available
within the VPC. Users desiring access to the Kibana dashboard must have access via
VPN or Direct Connect to the VPC. 

* The API Gateway used by the Designer UI is still available publicly and access is
still authorized using Cognito. The Lambda's backing the API will run within the VPC.

#### Bob P. Please review!!! This was copy and pasted from the README.


Provides the ability to deploy QnABot components within VPC infrastructure via a new template named public-vpc-support.json.
This template is made available for use as a separate installation mechanism. It is not the default template utilized in the
public distribution buckets. Please take great care in deploying QnABot in VPC. The Elasticsearch Cluster
becomes bound to the VPC as well as the Lambda's installed. The Elasticsearch cluster is no longer available
outside of the VPC. All Lambdas are bound to the VPC to allow communication with the cluster.

The following limitations exist:

### Version 4.4.0

- Preview VPC support - [readme](./VPCSupportREADME.md)
- Preview BotRouter support - [readme](./BotRoutingREADME.md)
- Upgrade to Elasticsearch service version 7.9
- Slack client support via Lex with Slack specific markdown support
- Added support for Alexa re-prompt functionality  

VPC support is enabled in beta mode through a new template available in the distribution repos. Please understand
the content in [readme](./VPCSupportREADME.md) before proceeding with this type of deployment.

- artifacts/aws-ai-qna-bot/templates/public-vpc-support.json
This beta template exposes two new additional parameters that can be specified when deployed using the CloudFormation console.
These parameters are:
- VPCSubnetIdList
- VPCSecurityGroupIdList
As one might expect a set of SubnetIds and SecurityGroupIds need to be specified. Two private subnets with appropriate NAT
based gateway to public internet should be selected. The security group specified must allow at a minimum inbound
connectivity on port 443. The Elasticsearch cluster and all Lambdas will be attached to these private subnets. The
Designer UI is still available outside of the VPC but requires login via the Cognito user pool. The Elasticsearch
cluster will not be available externally. Users wishing to use the Kibana console will need VPN connectivity to the
VPC and is outside the scope of this document.

