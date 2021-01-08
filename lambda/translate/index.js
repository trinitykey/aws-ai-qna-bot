const AWS=require('aws-sdk');

exports.handler =  async function(event, context) {
    try {


        console.log(event)

        var translate = new AWS.Translate();

        console.log(event["file"]);
        var csvFile = Buffer.from(event["file"], 'base64').toString("ascii");
        var response = await translate.importTerminology({
                "Name":event["name"],
                "MergeStrategy":'OVERWRITE',
                "Description":event["description"],
                "TerminologyData":{
                    'File':csvFile,
                    'Format': 'CSV'
                }
        }).promise()
    console.log("complete")
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
  