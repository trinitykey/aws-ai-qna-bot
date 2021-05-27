const Promise = require('bluebird')
const _ = require('lodash')
const AWS = require('aws-sdk');
var log = require("qna-log.js")


async function get_userLanguages(inputText) {
    const params = {
        Text: inputText /* required */
    };
    const comprehendClient = new AWS.Comprehend();
    const languages = comprehendClient.detectDominantLanguage(params).promise();
    return languages;
}

async function get_terminologies(sourceLang,settings) {
    var logSettings = {
        settings: settings
    }
    const translate = new AWS.Translate();
    log.info("Getting registered custom terminologies",logSettings);
    const configuredTerminologies = await translate.listTerminologies({}).promise();
    logSettings.messageParams = configuredTerminologies
    log.info("terminology response ",logSettings);
    const sources = configuredTerminologies["TerminologyPropertiesList"].filter(t => t["SourceLanguageCode"] == sourceLang).map(s => s.Name);
    logSettings.messageParams = sources
    log.info("Filtered Sources " + JSON.stringify(sources));
    return sources;
}

async function get_translation(inputText, sourceLang, targetLang, req) {
    var logSettings = {
        settings: req._settings,
        req:req
    }
    const customTerminologyEnabled = _.get(req._settings, "ENABLE_CUSTOM_TERMINOLOGY") == true;
    const params = {
        SourceLanguageCode: sourceLang, /* required */
        TargetLanguageCode: targetLang, /* required */
        Text: inputText, /* required */
    };
    logSettings.PII = params;
    log.info("get_translation:", logSettings);
    if (targetLang === sourceLang) {
        log.info("get_translation: source and target are the same, translation not required.",logSettings);
        return inputText;
    }
    logSettings.PII = undefined
    if (customTerminologyEnabled) {
        log.info("Custom terminology enabled",logSettings);
        const customTerminologies = await get_terminologies(sourceLang);
        log.messageParams = customTerminologies
        log.info("Using custom terminologies ",logSettings);
        params["TerminologyNames"] = customTerminologies;
    }
    const translateClient = new AWS.Translate();
    try {
        logSettings.PII = params
        log.info("Fulfillment params ",logSettings);
        const translation = await translateClient.translateText(params).promise();
        logSettings.PII = translation
        log.info("Translation response ",logSettings);
        return translation.TranslatedText;
    } catch (err) {
        logSettings.error = e
        log.error("Error during translation. Returning: ",logSettings);
        return inputText;
    }
}

function set_userLocale(Languages, userPreferredLocale, defaultConfidenceScore, req) {
    var logSettings = {
        settings: req._settings,
        req:req
    }
    let locale = '';
    let userDetectedLocaleConfidence = Languages.Languages[0].Score;
    let userDetectedLocale = Languages.Languages[0].LanguageCode;
    let isPreferredLanguageDetected = false;
    let i = 0;
    let userDetectedSecondaryLocale;

    log.info("preferred lang", userPreferredLocale);
    for (i = 0; i <= Languages.Languages.length - 1; i++) {
        log.info("found lang: " + Languages.Languages[i].LanguageCode,logSettings);
        log.info("score: " + Languages.Languages[i].Score,logSettings);
        if (Languages.Languages[i].LanguageCode === userPreferredLocale) {
            isPreferredLanguageDetected = true;
            userDetectedLocale = Languages.Languages[i].LanguageCode;
        }
        if (i > 0 && Languages.Languages[i].LanguageCode !== 'en' && userDetectedSecondaryLocale === undefined) {
            userDetectedSecondaryLocale = Languages.Languages[i].LanguageCode;
        }
    }
    log.info("isPreferredLanguageDetected "+ isPreferredLanguageDetected,logSettings);
    log.info("detected locale " + userDetectedLocale,logSettings);
    log.info("detected secondary locale" +userDetectedSecondaryLocale,logSettings);
    log.info("detected Confidence " + userDetectedLocaleConfidence,logSettings);

    _.set(req.session, "userDetectedLocale", userDetectedLocale);
    _.set(req.session, "userDetectedLocaleConfidence", userDetectedLocaleConfidence);
    if (userDetectedSecondaryLocale) {
        _.set(req.session, "userDetectedSecondaryLocale", userDetectedSecondaryLocale);
    } else {
        if (req.session.userDetectedSecondaryLocale) delete req.session.userDetectedSecondaryLocale;
    }

    if (userPreferredLocale && userDetectedLocale !== '') {
        locale = userPreferredLocale;
        log.info("set user preference as language to use: " + locale,logSettings);
    } else if ((userPreferredLocale === undefined || userPreferredLocale === '') && userDetectedLocaleConfidence <= defaultConfidenceScore) {
        locale = 'en'; // default to english
        log.info("Detected language confidence too low, defaulting to English ",logSettings);
    } else {
        locale = userDetectedLocale;
        log.info("set detected language as language to use: "+ locale,logSettings);
    }
    return locale;
}

async function set_translated_transcript(locale, req) {
    var logSettings = {
        settings: req._settings,
        req:req
    }
    const SessionAttributes = _.get(req, 'session');
    const detectedLocale = SessionAttributes.userDetectedLocale;
    const detectedSecondaryLocale = SessionAttributes.userDetectedSecondaryLocale;

    if ( ! req.question.toLowerCase().startsWith("qid::")) {
        if (locale === 'en' && detectedLocale === 'en' && detectedSecondaryLocale === undefined) {
            log.info("No translation - english detected",logSettings);
        } else if (locale === 'en' && detectedLocale === 'en' && detectedSecondaryLocale) {
            log.PII = req.question
            log.info("translate to english using secondary detected locale:  ", logSettings);
            const translation = await get_translation(req.question, detectedSecondaryLocale, 'en',req);

            _.set(req, "_translation", translation);
            _.set(req, "question", translation);
            log.info("Overriding input question with translation: ", logSettings);
        }  else if (locale !== '' && locale.charAt(0) !== '%' && detectedLocale && detectedLocale !== '') {
            log.info("Confidence in the detected language high enough.",logSettings);
            const translation = await get_translation(req.question, detectedLocale, 'en',req);

            _.set(req, "_translation", translation);
            _.set(req, "question", translation);
            log.info("Overriding input question with translation: ", logSettings);
        }  else {
            logSettings.PII = undefined
            log.info ('not possible to perform language translation',logSettings)
        }
    } else {
        log.info("Question targeting specified Qid (starts with QID::) - skip translation",logSettings);
    }

}

exports.set_multilang_env = async function (req) {
    // Add QnABot settings for multilanguage support
    var logSettings = {
        settings: req._settings,
        req:req
    }
    log.info("Entering multilanguage Middleware",logSettings);

    let userLocale = '';
    const defaultConfidenceScore = req._settings.MINIMUM_CONFIDENCE_SCORE;
    const userLanguages = await get_userLanguages(req.question);
    const userPreferredLocale = req.session.userPreferredLocale ? req.session.userPreferredLocale : '';
    userLocale = set_userLocale(userLanguages, userPreferredLocale, defaultConfidenceScore, req);
    _.set(req.session, "userLocale", userLocale);
    _.set(req._event, "origQuestion", req.question);
    await set_translated_transcript(userLocale, req);

    return req;
}


exports.translateText = async function (inputText, sourceLang, targetLang,req) {
    const res = await get_translation(inputText, sourceLang, targetLang,req);
    return res.TranslatedText;
}

exports.get_translation = get_translation;

