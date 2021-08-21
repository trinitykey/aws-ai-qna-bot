var aws=require('aws-sdk')
aws.config.region=process.env.AWS_REGION


function isJson(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }
  


async function get_parameter(param_name) {
    var ssm = new aws.SSM();
    var params = {
      Name: param_name,
      WithDecryption: true,
    };
    var response = await ssm.getParameter(params).promise();
    var settings = response.Parameter.Value;
    if (isJson(settings)) {
      settings = JSON.parse(response.Parameter.Value);
    }
    return settings;
}

async function get_settings(default_settings_param,custom_settings_param) {
    var default_settings = await get_parameter(default_settings_param);
    var custom_settings = await get_parameter(custom_settings_param);
    let settings = {}
    Object.assign(settings,default_settings,custom_settings)
    console.log("Merged Settings: ", settings);
    return settings;
}

async function addOptionalFields(schema){

    let default_settings_param = process.env.DEFAULT_SETTINGS_PARAM;
    let custom_settings_param = process.env.CUSTOM_SETTINGS_PARAM;
    let settings = await get_settings(default_settings_param,custom_settings_param);
    if(settings.SHOW_TEASEBUBBLE_FIELD === "True" || settings.SHOW_TEASEBUBBLE_FIELD === "true" ){
      
        schema.qna.properties.alt.properties.tease ={
            type:"string",
            title:"Tease Answer",
            description:"Alternate Tease answer",
            maxLength:8000,
            propertyOrder: 2
        }
    }
}

exports.handler = async (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    var schema = {
        quiz: require('./quiz.js'),
        qna: require('./qna.js')
    }
    await addOptionalFields(schema)
    return schema
}
