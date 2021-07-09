//start connection
var Promise=require('bluebird');
var bodybuilder = require('bodybuilder');
var get_keywords=require('./keywords');
var _=require('lodash');


function build_query(params) {
    return(get_keywords(params))
    .then(function(keywords) {
        var query=bodybuilder();
        if (keywords.length > 0) {
            query = query.filter(
      			'nested',{
      				path:'questions',
      				query: {
                    	match:{
                        	'questions.q':{
                            	query: keywords,
                                minimum_should_match: _.get(params,'minimum_should_match','2<75%'),
                                zero_terms_query: 'all'
                            }
                        }
                	}
    			}
            );          
        } 
        if (_.get(params, 'enable_client_filters', "false").toLowerCase() === "true") {
            var qnaClientFilter = _.get(params, 'qnaClientFilter', "") ;
            query = query.orFilter(
                'bool', {
                    "must": [
                        {
                            "exists": {
                              "field": "clientFilterValues"
                                }
                        },
                        {
                            "term": {
                              "clientFilterValues": qnaClientFilter
                            }
                        }
                    ]
                }
            )
    		.orFilter(
                'bool', {
                   "must_not": [
                        {
                            "exists": {
                              "field": "clientFilterValues"
                            }
                        }
                    ]
                }
            );
        }
        query = query.orQuery(
            'nested',{
            score_mode:'sum',
            boost:2,
            path:'questions'},
            q=>q.query('match','questions.q',params.question)
        ) ;
        if (_.get(params, 'score_answer_field', "false").toLowerCase() === "true") {
            query = query.orQuery('match','a',params.question) ;  
        }
        query = query.orQuery('match','t',_.get(params,'topic',''))
        .from(_.get(params,'from',0))
        .size(_.get(params,'size',1))
        .build();
        console.log("ElasticSearch Query",JSON.stringify(query));
        return new Promise.resolve(query);
    });
}


module.exports=function(params){
    return build_query(params);
};


/*
var testparams = {
    question: "what is the answer",
    topic: "optional_topic",
    from: 0,
    size: 0,
    use_keyword_filters: "true",
    enable_client_filters: "true",
    qnaClientFilter: "filter1"
    
};
build_query(testparams)
*/
