const AWS=require('aws-sdk');
const { response } = require('express');

exports.handler =  async function(event, context) {
    try {



        var translate = new AWS.Translate();
        var parameters = JSON.parse(event["body"])
        var response = await translate.import_terminology(
                Name=parameters["name"],
                MergeStrategy='OVERWRITE',
                Description=parameters["description"],
                TerminologyData={
                    'File': Buffer.from(event.file.base64, 'base64'),
                    'Format': 'CSV'
                },
            ).promise()

    } catch (e) {
        console.log(e)
        return{
            statusCode: 500,
            message: e
        }
    }
    return {
        statusCode: 200,
        body: JSON.parse(response)
    }

    
  }