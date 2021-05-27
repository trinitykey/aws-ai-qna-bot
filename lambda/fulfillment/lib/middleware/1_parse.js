var Promise = require('bluebird')
var lex = require('./lex')
var multilanguage = require('./multilanguage')
var get_sentiment=require('./sentiment');
var alexa = require('./alexa')
var _ = require('lodash')
var AWS = require('aws-sdk');
var log = require("qna-log.js")
var utils = require("utilities.js")

// makes best guess as to lex client type in use based on fields in req.. not perfect
function getClientType(req) {
    if (req._type == 'ALEXA') {
        return req._type ;
    }
    // Try to determine which Lex client is being used based on patterns in the req - best effort attempt.
    const voiceortext = (req._preferredResponseType == 'SSML') ? "Voice" : "Text" ;
    if (_.get(req,"_event.requestAttributes.x-amz-lex:channel-type") == "Slack") {
        return "LEX.Slack." + voiceortext ;
    } else if (_.get(req,"_event.requestAttributes.x-amz-lex:channel-type") == "Twilio-SMS") {
        return "LEX.TwilioSMS." + voiceortext ;
    } else if (_.get(req,"_event.requestAttributes.x-amz-lex:accept-content-types")) {
        return "LEX.AmazonConnect." + voiceortext ;
    }
    else if (/^.*-.*-\d:.*-.*-.*-.*$/.test(_.get(req,"_event.userId"))){
        // user id pattern to detect lex-web-uithrough use of cognito id as userId: e.g. us-east-1:a8e1f7b2-b20d-441c-9698-aff8b519d8d5
        // TODO: add another clientType indicator for lex-web-ui?
        return "LEX.LexWebUI." + voiceortext ;
    } else {
        // generic LEX client
        return "LEX." + voiceortext ;
    }
}


module.exports = async function parse(req, res) {

    // Add QnABot settings from Parameter Store
    var settings = await utils.get_settings();
    var logSettings = {
        settings:settings,
        req:req,
        res:res
    }
    _.set(req, "_settings", settings);

    req._type = req._event.version ? "ALEXA" : "LEX"

    switch (req._type) {
        case 'LEX':
            Object.assign(req, await lex.parse(req))
            _.set(req,"_preferredResponseType","PlainText") ;
            // Determine preferred response message type - PlainText, or SSML
            const outputDialogMode = _.get(req,"_event.outputDialogMode");
            if (outputDialogMode == "Voice") {
                _.set(req,"_preferredResponseType","SSML") ;
            } else if (outputDialogMode == "Text") {
                // Amazon Connect uses outputDialogMode "Text" yet indicates support for SSML using request header x-amz-lex:accept-content-types
                const contentTypes = _.get(req,"_event.requestAttributes.x-amz-lex:accept-content-types","") ;
                if (contentTypes.includes("SSML")) {
                    _.set(req,"_preferredResponseType","SSML") ;
                }
            } else {
                log.warn(logSettings,"Unrecognised value for outputDialogMode:"+ outputDialogMode)
            }
            break;
        case 'ALEXA':
            Object.assign(req, await alexa.parse(req))
            _.set(req,"_preferredResponseType","SSML") ;
            break;
    }
    

    req._clientType = getClientType(req) ;


    // multilanguage support 
    if (_.get(settings, 'ENABLE_MULTI_LANGUAGE_SUPPORT')) {
        await multilanguage.set_multilang_env(req);
    }
    // end of multilanguage support 
    
    // get sentiment
    if (_.get(settings, 'ENABLE_SENTIMENT_SUPPORT')) {
        let sentiment = await get_sentiment(req.question);
        req.sentiment = sentiment.Sentiment ;
        req.sentimentScore = sentiment.SentimentScore ;
    } else {
        req.sentiment = "NOT_ENABLED";
        req.sentimentScore = {} ;
    }  

    Object.assign(res, {
        type: "PlainText",
        message: "",
        session: _.mapValues(_.omit(_.cloneDeep(req.session), ["appContext"]),
            x => {
                try {
                    return JSON.parse(x)
                } catch (e) {
                    return x
                }
            }),
        card: {
            send: false,
            title: "",
            text: "",
            url: ""
        }
    })
    // ensure res.session.qnabotcontext exists
    if ( ! _.get(res,"session.qnabotcontext")) {
        _.set(res,"session.qnabotcontext",{}) ;
    }
    return { req, res }
}