var Promise=require('bluebird')
var _=require('lodash')
var log = require("qna-log.js")
var utils = require("utilities.js")


module.exports=class router {
    constructor(){
        this.middleware=[] 
    }

    async start(event,callback){
        var logSettings = {
            req: event,
            settings: utils.get_settings()
        }

        log.info("start processing",logSettings)
        try{
            var res=await this._walk( {_event:event})
            logSettings.res = res
            log.info("final:",logSettings)
            callback(null,res)
        }catch(e){
            logSettings.error = e
            log.error("throwing response:",logSettings)
            if(e.action==='END'){
                callback(null)
            }else if(e.action==="RESPOND"){
                callback(null,e.message)
            }else{
                callback(e)
            }
        }
        
    }
    async _walk(req,res={},index=0){
        console.log(JSON.stringify({req,res},null,2))

        if(this.middleware[index]){
            console.log(`middleware=${this.middleware[index].name}`)
            var result=await this.middleware[index](req,res)
            return await this._walk(result.req,result.res,++index)
        }else{
            return _.get(res,"out",res)
        }
    }
    add(fnc){
        this.middleware.push(fnc)
    }
}



