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

function verbose(params) {
  _log("VERBOSE", params, 4);
}

function debug(params) {
  _log("DEBUG", params, 4);
}

function info(params) {
  _log("INFO", params, 4);
}

function warn(params) {
  _log("WARN", params, 4);
}

function error(params) {
  _log("ERROR", params.req, params, 4);
}

function fatal(params) {
  _log("FATAL", params, 4);
}

function _log(logLevel, params, callLevel = 3) {
  settings = params.settings != undefined ? params.settings : _.get(req,"_settings")

  var callerInfo = _getCallerInfo(callLevel);
  var logLevels = ["VERBOSE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"];
  var logLevelSetting = _.get(req, "_settings.LOG_LEVEL", "INFO", "FATAL");
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
  var loggedRequest = _.clone(req);
  var loggedResponse = _.clone(res);

  var redactedUserProperties = [
    "sessionAttributes.qnabotcontext",
    "currentIntent.slots",
    "currentIntent.slotDetails",
    "inputTranscript",
    "recentItemSummaryView.slots",
    "session.qnabotcontext",
    "question",
    "session.qnabotcontext.previous.q",
  ];

  if (messageLogLevel >= 1) {
    loggedRequest._settings = "xxxxxxx";
  }

  logMessage.callerInfo = callerInfo;

  if (shouldRedact) {
    for (const property of redactedUserProperties) {
      _.set(loggedRequest, property, "xxxxxxx");
      _.set(loggedResponse, property, "xxxxxxx");
    }
  }

  logMessage.request = loggedRequest;
  logMessage.response = loggedResponse;
  logMessage.message = message;

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

