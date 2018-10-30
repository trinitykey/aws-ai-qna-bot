var aws=require('aws-sdk')
aws.config.region=process.env.AWS_REGION
var s3=new aws.S3()

exports.handler = (event, context, callback) => {
    var timestamp = event.time
    var temp = "status/"+timestamp+".json"
    var body = {bucket:process.env.EXPORTS_BUCKET,
                index:process.env.ES_INDEX,
                id:timestamp+".json",
                config:"status/"+timestamp+".json",
                tmp:"tmp/"+timestamp+".json",
                key:"automated-backups/"+timestamp+".json",
                filter:"",
                status:"Started"
        }
    return s3.putObject({
        Bucket: process.env.EXPORTS_BUCKET,
        Key: temp,
        Body: JSON.stringify(body)
    })
}