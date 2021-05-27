var Promise=require('bluebird')
var lex=require('./lex')
var alexa=require('./alexa')
var _=require('lodash')
var util=require('./util')
var AWS=require('aws-sdk');
var log = require("qna-log.js")


async function update_userInfo(res,req) {
    var logSettings = {
        req: req,
        res: res,
        settings: req._settings
    }
    var dt = new Date();
    var usersTable = process.env.DYNAMODB_USERSTABLE;
    var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
    var params = {
        TableName: usersTable,
        Item: res._userInfo,
    };
    logSettings.PII = params
    log.info("Saving response user info to DynamoDB: ", logSettings);
    var ddbResponse={}
    try {
        ddbResponse = await docClient.put(params).promise();
    }catch(e){
        logSettings.error = e
        log.error("ERROR: DDB Exception caught - can't save userInfo: ",logSettings)
    }
    logSettings.messageParams = ddbResponse
    log.info("DDB Response: ", logSettings);
    return ddbResponse;
}

module.exports=async function userInfo(req,res){
    var logSettings = {
        req: req,
        res: res,
        settings: req._settings
    }
    log.info("Entering userInfo Middleware",logSettings)
    await update_userInfo(res,req);
    return {req,res}
}
