var AWS = require('aws-sdk');
const lambda = new AWS.Lambda();


var response = require('cfn-response-async');

exports.handler = async (event, context) => {
    try{
        console.log(JSON.stringify(event))
    if (event.RequestType == 'Delete') {
        return response.send(event, context, response.SUCCESS);
    }
    let alias = event.ResourceProperties.Alias
    let lambdaName = (event.ResourceProperties.FunctionName !== 'undefined' ? event.ResourceProperties.FunctionName : null);

    let aliases = await lambda.listAliases({
        FunctionName:lambdaName
    }).promise()
    console.log(JSON.stringify(aliases))

    let data =  await lambda.publishVersion({ FunctionName: lambdaName }).promise()

    if(aliases["Aliases"].filter(x => x.Name == alias).length == 0){
        await lambda.createAlias({
            Name: alias,
            FunctionName:lambdaName,
            FunctionVersion:data.Version
        }).promise()
    }else{
        let params = {
            FunctionName: lambdaName,
            Name: alias,
            FunctionVersion: data.Version
        }
        await lambda.updateAlias(params).promise();
    }

    return await response.send(event, context, response.SUCCESS, { 'Version': data.Version }, data.FunctionArn);
    }catch(err){
        console.log(err)
        return await response.send(event, context, response.FAILED, err);
    };

};
