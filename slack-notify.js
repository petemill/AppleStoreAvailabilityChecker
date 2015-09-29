var MY_SLACK_WEBHOOK_URL = '';//
var slack = require('slack-notify')(MY_SLACK_WEBHOOK_URL);

module.exports.notifyStockToAllSubscribers = function(subject, message) {
  slack.send({
    channel: '#iphone',
    text: subject + ': ' + message,
    mrkdwn: false,
    username: 'iPhone Stock'
  });
};
