//start connection
var _=require('lodash');
var Promise=require('bluebird');
var aws=require('aws-sdk');
const qnabot = require("qnabot/logging")


var stopwords = "a,an,and,are,as,at,be,but,by,for,if,in,into,is,it,not,of,on,or,such,that,the,their,then,there,these,they,this,to,was,will,with";

function get_keywords_from_comprehend(params) {
    // get keywords from question using Comprehend syntax api
    var keywords="";
    var keyword_syntax_types = _.get(params,'keyword_syntax_types') || "NOUN,PROPN,VERB,INTJ";
    var syntax_confidence_limit = _.get(params,'syntax_confidence_limit') || .20;
    var comprehend = new aws.Comprehend();
    var comprehend_params = {
        LanguageCode: 'en',
        Text: params.question
    };
    return(Promise.resolve(comprehend.detectSyntax(comprehend_params).promise()))
    .then(function(data) {
        for (var syntaxtoken of data.SyntaxTokens) {
            qnabot.debug(
                "WORD = '" + syntaxtoken.Text + "', "
                + "PART OF SPEECH = " + syntaxtoken.PartOfSpeech.Tag + ", "
                + "SCORE: " + syntaxtoken.PartOfSpeech.Score);
            if (keyword_syntax_types.split(",").indexOf(syntaxtoken.PartOfSpeech.Tag) != -1) {
                if (stopwords.split(",").indexOf(syntaxtoken.Text.toLowerCase()) == -1) {
                    if (syntaxtoken.PartOfSpeech.Score >= syntax_confidence_limit) {
                        qnabot.debug("+KEYWORD: " + syntaxtoken.Text);
                        if(!(syntaxtoken.Text.startsWith("'") || syntaxtoken.Text.startsWith("`"))){
                            keywords = keywords + syntaxtoken.Text + " ";
                        }else{
                            qnabot.debug("Not including " + syntaxtoken.Text)
                        }
                    } else {
                        qnabot.debug("X score < ", syntax_confidence_limit, " (threshold)");
                    }
                } else {
                    qnabot.debug("X '" + syntaxtoken.Text + "' is a stop word");
                }
            } else {
                qnabot.debug("X part of speech not in list:", keyword_syntax_types);
            }
        }
        if (keywords.length == 0) {qnabot.debug("Keyword list empty - no query filter applied")}
        else {qnabot.debug("KEYWORDS:",keywords)}
        return keywords;
    });
}

function get_keywords(params) {
    try{
        var contraction_list = JSON.parse(params.es_expand_contractions)

    }catch{
        qnabot.log("Improperly formatted JSON in ES_EXPAND_CONTRACTIONS: " + params.es_expand_contractions)
        contraction_list = {}
    }
    var new_question = "";
    var new_word= ""
    for(var word of params.question.split(" "))
    {
        for(var contraction in contraction_list )
        {   
            new_word = ""
            if(word.toLowerCase() == contraction.toLowerCase() || word.toLowerCase() == contraction.toLowerCase().replace("'","’")){
                new_word = contraction_list[contraction];
                break;
            }
        }
        new_question += " " + (new_word != "" ? new_word : word);
    }
    qnabot.log("Question after expanding contractions" + new_question)
    params.question = new_question


    if (_.get(params,'use_keyword_filters')) {
        qnabot.log("use_keyword_filters is true; detecting keywords from question using Comprehend");
        return get_keywords_from_comprehend(params);
    } else {
        qnabot.log("use_keyword_filters is false");
        return Promise.resolve("");
    }   
}

module.exports=function(params){
    return get_keywords(params);
};

