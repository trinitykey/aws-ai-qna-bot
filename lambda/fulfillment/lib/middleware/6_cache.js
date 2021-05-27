var Promise=require('bluebird')
var lex=require('./lex')
var alexa=require('./alexa')
var _=require('lodash')
var util=require('./util')
var log = require("qna-log.js")


module.exports=async function cache(req,res){
    var logSettings = {
        res:res,
        setting: req._settings
    }
    log.info("Entering Cache Middleware",logSettings)
    log.info("response:",logSettings)
    if(_.has(res,"out.response")){
        res.out.sessionAttributes.cachedOutput= res.out.response
    }
    log.info("edited response:",logSettings)
    return {req,res}
}
