const chromium = require('chrome-aws-lambda');
const AWS = require("aws-sdk");
const crypto = require('crypto');
const _=require('lodash');
const { settings } = require('cluster');

AWS.config.update({region:'us-east-1'});

/**
 * Function to check if a string has a JSON structure
 * @param str
 * @returns boolean
 */
function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}


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
/**
 * Function to get parameters from QnABot settings
 * @param param_name
 * @returns {*}
 */
async function get_parameter(param_name) {
    var ssm = new AWS.SSM();
    var params = {
        Name: param_name,
        WithDecryption: true
    };
    // TODO: update permissions
    var response = await ssm.getParameter(params).promise();
    var settings = response.Parameter.Value
    if (isJson(settings)) {
        settings = JSON.parse(response.Parameter.Value);
        settings = str2bool(settings) ;
    }
    return settings;
}

/**
 * Function to retrieve QnABot settings
 * @returns {*}
 */
async function get_settings() {
    var default_settings_param = process.env.DEFAULT_SETTINGS_PARAM;
    var custom_settings_param = process.env.CUSTOM_SETTINGS_PARAM;

    console.log("Getting Default QnABot settings from SSM Parameter Store: ", default_settings_param);
    var default_settings = await get_parameter(default_settings_param);

    console.log("Getting Custom QnABot settings from SSM Parameter Store: ", custom_settings_param);
    var custom_settings = await get_parameter(custom_settings_param);

    var settings = _.merge(default_settings, custom_settings);
    _.set(settings, "DEFAULT_USER_POOL_JWKS_URL");

    console.log("Merged Settings: ", settings);

    return settings;
}

var browser = null;
async function getPage(url)
{
    let result = null;
  
    try {
    if(browser == null)
    {
      browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    }
  
      let page = await browser.newPage();
  
      await page.goto(url);
  
      return {
          Page:page,
          Browser:browser
      };
    } catch (error) {
        console.log(error);
        throw error;
    } 
    
}

async function createKendraDocument(page,jobExecutionId,dataSourceId){
    var url = await page.url();
    doc = {
        "Id": crypto.createHash('sha1').update(url).digest('base64'),
        "Blob": await page.$eval('*', el => el.innerText),
        "Title": await page.title(),
        "Attributes": [
            {
            "Key": "_data_source_id",
            "Value": {
                "StringValue": dataSourceId
                }
            },
            {
            "Key": "_data_source_sync_job_execution_id",
            "Value": {
                "StringValue": jobExecutionId
                }
            },
            {
            "Key": "_source_uri",
            "Value": {
                "StringValue": url
                }    
            },
            {
            "Key": "_created_at",
            "Value": {
                "DateValue": Date.now()
                }    
            }
        ]
    }
    return doc;
}

async function getDataSourceIdFromDataSourceName(kendraIndexId,dataSourceName){
    var kendra = new AWS.Kendra();
    console.log(`Finding datasourceId for ${dataSourceName} for IndexID ${kendraIndexId}`)
    var foundDataSourceIds = (await kendra.listDataSources({IndexId: kendraIndexId}).promise()).SummaryItems.filter(s => s.Name == dataSourceName).map(m => m.Id)
    if(foundDataSourceIds.length == 0)
    {
        return undefined;
    }
    return foundDataSourceIds[0]

}
async function startKendraSync(kendraIndexId,name,forceSync=false)
{
    var kendra = new AWS.Kendra();
    var dataSourceId;
    var params = {
        IndexId: kendraIndexId, /* required */
      };
    console.log(`Starting Kendra sync for IndexId ${kendraIndexId} DataSource Name ${name}`)
    foundDataSourceId = await getDataSourceIdFromDataSourceName(kendraIndexId,name);
    console.log(`Found datasourceId ${foundDataSourceId}`)
    if(!foundDataSourceId)
    {
        var params = {
            IndexId: kendraIndexId, 
            Name: name,
            Type: "CUSTOM",
        }
        console.log(`${name} doesn't exist.  Creating it....`)
        var createResponse = await kendra.createDataSource(params).promise();
        dataSourceId = createResponse.Id
    }else{
        dataSourceId = foundDataSourceId;
    }
    console.log("Getting sync Job status")
    var status = await getSyncJobStatus(kendraIndexId,dataSourceId)

    if(status.Status != "COMPLETE" && !forceSync){
        throw `A sync job is currently running for the data source ${name} Id ${dataSourceId}`;
    }

    var params = {
        Id: dataSourceId, /* required */
        IndexId: kendraIndexId /* required */ 
      };
    console.log("Starting DataSourceSyncJob")
    var syncResponse = await kendra.startDataSourceSyncJob(params).promise();
    return  {
        ExecutionId:syncResponse.ExecutionId,
        DataSourceId: dataSourceId
    }


}

async function stopSyncJob(kendraIndexId,dataSourceName){
    var kendra = new AWS.Kendra();
    var indexId = await getDataSourceIdFromDataSourceName(kendraIndexId,dataSourceName)
    console.log(`Stop syncing Datasource ${dataSourceName}:${indexId}`)
    var status = await getSyncJobStatus(kendraIndexId,indexId);
    if(status.Status == "PENDING"){
        console.log(`Stopping data source ${indexId} on Kendra Index ${kendraIndexId}`)
        kendra.stopDataSourceSyncJob({
            Id: indexId,
            IndexId:kendraIndexId
        })
    }
}

async function putDocuments(kendraIndexId,dataSourceId,documents){
    try{

        var kendra = new AWS.Kendra();


        var batchPutDocumentResponse = await kendra.batchPutDocument({
            Documents: documents,
            IndexId: kendraIndexId
        }).promise();
        //TODO: Add error handling
        return batchPutDocumentResponse
    }finally{
        await kendra.stopDataSourceSyncJob({
            Id:dataSourceId,
            IndexId: kendraIndexId
        }).promise();
    }
}

async function getSyncJobStatus(kendraIndexId,dataSourceId,executionId){
    var kendra = new AWS.Kendra();
    var syncJobResult = await kendra.listDataSourceSyncJobs({
        Id: dataSourceId,
        IndexId: kendraIndexId
    }).promise();
    if(executionId){
        var executionSyncJobs =  syncJobResult["History"].filter(h => h.ExecutionId == executionId)
        if (executionSyncJobs.length != 1){
            return {
                "Status":"",
                "ErrorMessage":"",
                "StartTime":"",
                "ExecutionId":""
            }
        }
        var errorMessage =""
        if(status != "SUCCEEDED"){
            errorMessage = currentStatus[0].ErrorMessage
        }
        return {
            Status:executionSyncJobs[0].Status,
            ErrorMessage: errorMessage
        }
        
    }
    console.log("SyncJobHistory")
    console.log(JSON.stringify(syncJobResult["History"]))
    var dataSourceSyncJob = syncJobResult["History"].sort((a,b) => a.StartTime > b.StartTime ? -1 : 1)[0];
    var pendingStatus = ["SYNCING","INCOMPLETE","STOPPING","SYNCING_INDEXING"]
    if(pendingStatus.includes(dataSourceSyncJob.Status)){
        return {
            Status:"PENDING",
            ErrorMessage:"",
            "StartTime": dataSourceSyncJob.StartTime,
            ExecutionId:dataSourceSyncJob.ExecutionId
        }
    }
    else{
        return{
            Status:dataSourceSyncJob.Status,
            "StartTime": dataSourceSyncJob.StartTime,
            ErrorMessage:""
        }

    }


}

async function updateCloudWatchEvent(ruleName,settings){
    var cloudwatchevents = new AWS.CloudWatchEvents();
    var assignedRules
    var rule = await cloudwatchevents.describeRule({Name:ruleName}).promise();
    var currentState = settings.ENABLE_KENDRA_WEB_CRAWLER ? "ENABLED" : "DISABLED";
    console.log(`RuleName ${ruleName} KENDRA_CRAWLER_SCHEDULE ${settings.KENDRA_CRAWLER_SCHEDULE} settings State ${currentState}`)
    console.log(`RuleName ${ruleName} current schedule        ${rule.ScheduleExpression} current state  ${rule.State }`)
    //only allow rate() syntax because that is easy to parse and put guard rails around
    if(!(settings.KENDRA_CRAWLER_SCHEDULE.startsWith("rate(") && settings.KENDRA_CRAWLER_SCHEDULE.endsWith(")")))
    {
        throw "KENDRA_CRAWLER_SCHEDULE must use CloudWatch rate() format -- see https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#RateExpressions"
    }
    var timeParts = settings.KENDRA_CRAWLER_SCHEDULE.replace("rate(","").replace(")","").split(" ");
    console.log("parts " + JSON.stringify(timeParts));
    if (timeParts.length != 2)
    {
        throw "Invalid schedule format.  See https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#RateExpressions for valid expressions"
    }
    validUnits = ["hour","hours","day","days"]
    if(!validUnits.includes(timeParts[1]))
    {
        throw "Kendra Crawler only supports hours and days";
    }
    if(parseInt(timeParts[0]) != timeParts[0]){
        throw "Only integer values are supported";
    }
    if(rule.ScheduleExpression != settings.KENDRA_CRAWLER_SCHEDULE || rule.State != currentState){
        console.log(`Updating rule ${ruleName}`)
        var params = {
                Name: rule.Name,
                Description: rule.Description,
                ScheduleExpression: settings.KENDRA_CRAWLER_SCHEDULE,
                State: currentState,
            };
        var result = await cloudwatchevents.putRule(params).promise();
        console.log("Rule Updated " + JSON.stringify(result));

    }
}

exports.handler = async (event, context,callback) => {
    console.log("Incoming event " + JSON.stringify(event))

    try{
        var settings = await get_settings();
        var kendraIndexId = settings.KENDRA_CRAWLER_INDEX;
        if(event["detail-type"] == "Parameter Store Change")
        {
            await updateCloudWatchEvent(process.env.CLOUDWATCH_RULENAME,settings);
            return;
        }
        if(event["path"] == "/crawler/status"){
            var dataSourceId = await getDataSourceIdFromDataSourceName(kendraIndexId,process.env.DATASOURCE_NAME)
            if(!dataSourceId){
                return {
                    "statusCode": 200,
                    "body": JSON.stringify({"Status":"NOTCREATED"}),
                    "isBase64Encoded": false
                };    
            }

            var syncStatus = await getSyncJobStatus(kendraIndexId,dataSourceId) 
            return {
                "statusCode": 200,
                "body": JSON.stringify(syncStatus),
                "isBase64Encoded": false
            };
        }
        if(event["path"] == "/crawler/stop"){
            console.log("Stopping Sync for " + kendraIndexId)
            await stopSyncJob(kendraIndexId,process.env.DATASOURCE_NAME)
            return {
                "statusCode": 200,
                "body": JSON.stringify({"Status":"SUCCESS"}),
                "isBase64Encoded": false
            };
        }

        if(!kendraIndexId)
        {
            throw "KENDRA_CRAWLER_INDEX was not specified in settings"
        }
        var urls = settings.KENDRA_CRAWLER_URLS.split(",");
        await updateCloudWatchEvent(process.env.CLOUDWATCH_RULENAME,settings)
        await indexPages(kendraIndexId,process.env.DATASOURCE_NAME,urls,true);
        return;

   } catch(err){
     console.log(err)
     throw err
   }
};

async function indexPages(kendraIndexId,dataSourceName,urls,forceSync=false)
{
    try {
        var dataSourceResponse = await startKendraSync(kendraIndexId,dataSourceName,forceSync)
        var documents = [];
        for(url of urls){
            console.log("Retrieving " + url)
            var page =  await getPage(url)
            var document = await createKendraDocument(page.Page,dataSourceResponse.ExecutionId,dataSourceResponse.DataSourceId)
            documents.push(document);


        }

        var putResults = await putDocuments(kendraIndexId,dataSourceResponse.DataSourceId,documents)
        page.Browser.close();
       } catch(err){
         console.log(err)
         throw err;
       }
}

// ;(async function main () {

//      process.env.DEFAULT_SETTINGS_PARAM = "CFN-DefaultQnABotSettings-JQRrDQLejA6E";
//      process.env.CUSTOM_SETTINGS_PARAM = "CFN-CustomQnABotSettings-oZwgxFj59Cvt";
//      process.env.DATASOURCE_NAME = "qnaBotKendraCrawler"


//   })()