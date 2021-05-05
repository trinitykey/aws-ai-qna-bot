# IAM Policies needed to install, update, and delete QnABot

1. Replace 'xxxx' with your AWS Account in both the CreateUpdateStackPolicy.json and DeleteStackPolicy.json files
2. Attach both files to the IAM user used to install QnABOT
3. Your stack *must* begin with either 'qna' or 'QnA' to use these policies