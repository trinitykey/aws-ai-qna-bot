const AWS=require('aws-sdk');

exports.handler =  async function(event, context) {
    try {


        console.log(event)
        const usp = new URLSearchParams(event["body"]);

        const parameters = {};

        for (const [key, value] of usp.entries()) {
            parameters[key] = value
        }
        var translate = new AWS.Translate();

        console.log(parameters["file"]);
        var csvFile = new Buffer(parameters["file"], 'base64').toString("ascii");
        var response = await translate.importTerminology({
                "Name":parameters["name"],
                "MergeStrategy":'OVERWRITE',
                "Description":parameters["description"],
                "TerminologyData":{
                    'File':csvFile,
                    'Format': 'CSV'
                }
        }).promise()

    } catch (e) {
        console.log(e)
        return{
            statusCode: 500,
            message: e
        }
    }
    return {
        statusCode: 200,
        body: JSON.stringify(response)
    }

    
  }
  