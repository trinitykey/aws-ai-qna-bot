const _ = require("lodash")
exports.handler =  async function(event, context) {
    var args = _.get(event,"res.result.args")
    var start = 0
    var end = 3
    if(args){
        args = JSON.parse(args)
        start = args.start != undefined ? args.start : start 
        end = args.end != undefined ? args.end : end


    }
    _.set(event,"res.card",{
                                title: "Recent Topics",
                                send:true,
                                buttons: _.get(event,"res.card.buttons",[])
                            })

    var topics = event.res._userInfo.recentTopics.sort((t1,t2) => {
        if(t1.dateTime == t2.dateTime){
            return 0
        }
        return t2.dateTime < t1.dateTime ? -1 : 1
    })
    console.log("topics")
    console.log(JSON.stringify(topics))
    for (var topic of topics.slice(start,end)){
        var labelParts = _.get(topic,"label","").split("::")

        if(!labelParts[0])
        {
            continue
        }
        var label = labelParts[0]
        var qid = _.get(topic,"qid")

        if(labelParts.longth == 2){
            qid = labelParts[1]
        }

      event.res.card.buttons.push({
        text: label,
        value: "qid::" + qid
      })
    }
    console.log(JSON.stringify(event))
    return  event
  }
