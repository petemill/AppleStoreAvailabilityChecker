var AWS = require('aws-sdk');
//AWS.config.loadFromPath('./aws-config.json');


exports.notifyStockToAllSubscribers = function(subject, message) {
  return true;
  var sns = new AWS.SNS();

  var params = {
    Message: message, /* required */
    Subject: subject,
    TopicArn: 'arn:aws:sns:eu-west-1:986671178573:AppleStockNotification'
  };
  sns.publish(params, function(err, data) {
    if (err) console.log('error sending sns message - ' + err, err.stack); // an error occurred
    else     console.log('sent sns message: ' + data);           // successful response
  });

};
