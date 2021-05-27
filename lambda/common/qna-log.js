
_ = require("lodash");

function _getCallerInfo(callLevel) {
  let e = new Error();
  let frame = e.stack.split("\n")[callLevel]; // We want the frame of the function that called the log function
  let frameParts = frame.split(":").reverse();
  let fileName = frameParts[2].split("(")[1];
  let lineNumber = frameParts[1];
  let functionName = frame.split(" ")[5];
  return {
    fileName: fileName,
    functionName: functionName,
    lineNumber: lineNumber,
  };
}



function verbose(message,params={}) {
  params.message = message
  _log("VERBOSE", params, 4);
}

function debug(message,params={}) {
  params.message = message
  _log("DEBUG", params, 4);
}

function info(message,params={}) {
  params.message = message
  _log("INFO", params, 4);
}

function warn(message,params={}) {
  params.message = message
  _log("WARN", params, 4);
}

function error(message,params={},err,stack) {
  params.message = message
  _log("ERROR", params, 4);
}

function fatal(message,params={}) {
  params.message = message
  _log("FATAL", params, 4);
}

/* Sends logs to stdout/CloudWatch Logs 
  logLevel - VERBOSE,DEBUG,INFO,WARN,ERROR,FATAL 
  params
    - settings
      - REDACT_VERIFIED_USER_INFO (true|false) - redact properties that may contain PII when the user is logged in
      - REDACT_ALL_USER_INFO (true|false) -- redact all properties that may contain PII
    - message - the log message. This will be passed in as a separate parameter by one of the exported log functions
    - req - the request object. The properties listed in the 'redactedUserProperties' will be redacted based on the above settings
    - res - the response object. The properties listed in the 'redactedUserProperties' will be redacted based on the above settings
    - messageParams - any JavaScript object that should be logged
    - PII - a JS string or object that should be redacted or logged based on the setting
*/

function _log(logLevel, params, callLevel = 3) {

  var callerInfo = _getCallerInfo(callLevel);
  var logLevels = ["VERBOSE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"];
  var logLevelSetting = _.get(params.settings, "LOG_LEVEL", "INFO", "FATAL");
  var redactVerifiedUserInfo =
    _.get(params.settings, "REDACT_VERIFIED_USER_INFO", "false").toLowerCase() ==
    "true";
  var redactAllUserInfo =
    _.get(params.settings, "REDACT_ALL_USER_INFO", "true").toLowerCase() ==
    "true";
  var userIsVerified =
    _.get(params.req, "userInfo.isVerifiedIdentity", "false") == "true";
  var shouldRedact =
    redactAllUserInfo || (redactVerifiedUserInfo && userIsVerified);

  var messageLogLevel = logLevels.findIndex((i) => i == logLevel.toUpperCase());
  var settingLogLevel = logLevels.findIndex(
    (i) => i == logLevelSetting.toUpperCase()
  );

  if (messageLogLevel < settingLogLevel) {
    return;
  }

  var logMessage = {};
  var loggedRequest = _.clone(params.req);
  var loggedResponse = _.clone(params.res);
  var loggedEvent = _.clone(params.lexV1Event)

  var redactedRequestResponseProperties = [
    "sessionAttributes.qnabotcontext",
    "currentIntent.slots",
    "currentIntent.slotDetails",
    "inputTranscript",
    "recentItemSummaryView.slots",
    "session.qnabotcontext",
    "question",
    "session.qnabotcontext.previous.q",
    "_event.slotDetails.slot.originalValue",
    "_event.inputTranscript"
  ];

  var redactedLexV1EventProperties = [
    "currentIntent.slotDetails.originalValue"
  ]

  if (messageLogLevel >= 1) {
    _.set(loggedRequest,"_settings","xxxxxxx");
  }

  logMessage.callerInfo = callerInfo;

  if (shouldRedact) {
    for (const property of redactedRequestResponseProperties) {
      _.set(loggedRequest, property, "xxxxxxx");
      _.set(loggedResponse, property, "xxxxxxx");
    }
    for(const property of redactedLexV1EventProperties){
      _.set(loggedEvent,property,"xxxxxxx") 
    }
  }
  logMessage.logLevel = logLevel;
  logMessage.settingLogLevel = settingLogLevel
  logMessage.request = loggedRequest;
  logMessage.response = loggedResponse;
  logMessage.message = params.message;
  logMessage.messageParams = params.messageParams
  if(params.PII){
    if(shouldRedact)
    {
      logMessage.PII = "xxxxxxx"
    }
    else{
      logMessage.PII = params.PII
    }
  }

  console.log(JSON.stringify(logMessage));
}

exports.debug = debug
exports.info = info
exports.warn = warn
exports.error = error
exports.fatal = fatal


var req = {};
_.set(req, "_settings.LOG_LEVEL", "DEBUG");
_.set(req, "_settings.REDACT_VERIFIED_USER_INFO", "true");
_.set(req, "userInfo.isVerifiedIdentity", "true");

debug(req, {}, "This is a test");

