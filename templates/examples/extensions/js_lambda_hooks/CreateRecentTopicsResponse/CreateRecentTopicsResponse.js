const _ = require("lodash");
exports.handler = async function(event, context) {
  console.log(event);
  var args = _.get(event, "res.result.args");
  var start = 0;
  var end = 3;
  if (args) {
    args = JSON.parse(args);
    start = args.start != undefined ? args.start : start;
    end = args.end != undefined ? args.end : end;
  }
  _.set(event, "res.card", {
    title: "Recent Topics",
    send: true,
    buttons: _.get(event, "res.card.buttons", []),
  });

  var settings = _.get(event, "req._settings", {});
  var topicMap = {},
    topicKey;
  for (var key of Object.keys(settings)) {
    if (key.startsWith("topic::")) {
      [, topicKey] = key.split("::");
      console.log(topicKey);
      topicMap[topicKey] = settings[key];
    }
  }

  var userTopics = event.res._userInfo.recentTopics.sort((t1, t2) => {
    if (t1.dateTime == t2.dateTime) {
      return 0;
    }
    return t2.dateTime < t1.dateTime ? -1 : 1;
  });

  for (var userTopic of userTopics.slice(start, end)) {
    if (!(userTopic.topic in topicMap)) {
      continue;
    }
    var [description, qid] = topicMap[userTopic.topic].split("::");

    if (!description || !qid) {
      console.log(
        "WARNING: The topic mapping topic::" +
          userTopic.topic +
          " is not defined properly.  The format should be <description>::<QID>. Using the description as the value."
      );
    }
    event.res.card.buttons.push({
      text: description,
      value: "qid::" + qid,
    });
  }
  return event;
};
