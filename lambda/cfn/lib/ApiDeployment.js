var aws=require('./util/aws')
var Promise=require('./util/promise')
aws.config.maxRetries=10
var api=new aws.APIGateway()
var _=require('lodash')
module.exports=class ApiDeployment {
    Create(params,reply){
        //We have a 200 resource stack limit for the master stack 
        //If we want to add an API resource to a nested stack we have to redeploy the same API
        //from the nested stack.  CF will send a Create, but we need to treat it like an Update
        if(!("ApiDeploymentId" in params))
        {
            run(()=>api.createDeployment(
                    _.omit(params,["buildDate","stage","Encryption","ApiDeploymentId","LexV2BotLocaleIds"])
                ).promise()
            )
            .tap(console.log)
            .then(x=>reply(null,x.id))
            .catch(reply)
        }
        else
        {
            console.log(`Updating ${params["ApiDeploymentId"]} as part of 'Create'`)
            var ID = params["ApiDeploymentId"];
            params = _.omit(params,["ApiDeploymentId"])
            this.Update(ID,params,{},reply)

        }
    }

    Update(ID,params,oldparams,reply){
        var self=this
        new Promise(function(res,rej){
            console.log(`Creating new deployment as part of 'Update'`)

            self.Create(params,function(error,id){
                error ? rej(error) : setTimeout(()=>res(id),2000)
            })
        })
        .then(id=>run(()=>api.updateStage({
                restApiId:params.restApiId,
                stageName:params.stage,
                patchOperations:[{
                    op:"replace",
                    path:"/deploymentId",
                    value:id
                }]
            }).promise()
            .then(()=>id)
        ))
        .then(id=>reply(null,id)) 
        .catch(x=>{
            console.log(x)
            reply(x)
        })
        .catch(reply)
    }
    
    Delete(ID,params,reply){
        run(()=>api.deleteDeployment({
            deploymentId:ID,
            restApiId:params.restApiId
        }).promise())
        .finally(x=>reply(null,ID))
    }
 }


 function run(fnc){
    return new Promise(function(res,rej){
        console.log("starting")
        function next(count){
            console.log("tries left:"+count)
            if(count>0){
                fnc()
                .then(res)
                .catch(x=>x.statusCode===429,x=>{
                    console.log("retry in "+x.retryDelay)
                    setTimeout(()=>next(--count),x.retryDelay*1000)
                })
                .catch(rej)
            }else{
                rej("timeout")
            }
        }
        next(10)
    })
}
