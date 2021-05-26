_ = require("lodash");
var log = require("qna-log.js")
var AWS = require('aws-sdk');




function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

exports.isJSon = isJson

function str2bool(settings) {
    var new_settings = _.mapValues(settings, x => {
        if (_.isString(x)) {
            x = x.replace(/^"(.+)"$/,'$1');  // remove wrapping quotes
            if (x.toLowerCase() === "true") {
                return true ;
            }
            if (x.toLowerCase() === "false") {
                return false ;
            }
        }
        return x;
    });
    return new_settings;
}

exports.str2bool = str2bool

async function get_parameter(param_name) {
    var ssm = new AWS.SSM();
    var params = {
        Name: param_name,
        WithDecryption: true
    };
    var response = await ssm.getParameter(params).promise();
    var settings = response.Parameter.Value ;
    if (isJson(settings)) {
        settings = JSON.parse(response.Parameter.Value);
        settings = str2bool(settings) ;
    }
    return settings;
}

exports.get_parameter = get_parameter

async function get_settings() {
    var default_jwks_param = process.env.DEFAULT_USER_POOL_JWKS_PARAM;
    var default_settings_param = process.env.DEFAULT_SETTINGS_PARAM;
    var custom_settings_param = process.env.CUSTOM_SETTINGS_PARAM;

    log.debug("Getting Default JWKS URL from SSM Parameter Store: "+ default_jwks_param);
    var default_jwks_url = await get_parameter(default_jwks_param);

    log.debug("Getting Default QnABot settings from SSM Parameter Store: "+ default_settings_param);
    var default_settings = await get_parameter(default_settings_param);

    log.debug("Getting Custom QnABot settings from SSM Parameter Store: "+ custom_settings_param);
    var custom_settings = await get_parameter(custom_settings_param);

    var settings = _.merge(default_settings, custom_settings);
    var logSettings = {
        settings:settings,
    }
    _.set(settings, "DEFAULT_USER_POOL_JWKS_URL", default_jwks_url);

    log.debug("Merged Settings: ", logSettings);

    if (settings.ENABLE_REDACTING) {
        log.info("redacting enabled",logSettings);
        process.env.QNAREDACT="true";
        process.env.REDACTING_REGEX=settings.REDACTING_REGEX;
    } else {
        log.info("redacting disabled",logSettings);
        process.env.QNAREDACT="false";
        process.env.REDACTING_REGEX="";
    }
    if (settings.DISABLE_CLOUDWATCH_LOGGING) {
        log.info("disable cloudwatch logging",logSettings);
        process.env.DISABLECLOUDWATCHLOGGING="true";
    } else {
        log.info("enable cloudwatch logging",logSettings);
        process.env.DISABLECLOUDWATCHLOGGING="false";
    }
    return settings;
}

exports.get_settings = get_settings