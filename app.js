var http = require('https');
var sendNotifications = require('./slack-notify.js');

var AvailabilityApi = {};
if (!Array.prototype.contains) {
  Array.prototype.contains = function(searchElement /*, fromIndex*/ ) {
    return this.indexOf(searchElement) !== -1;
	};
}
var UserPrefs = {};
UserPrefs.ModelsInterestedIn = [
	"MKUW2LL/A",
	"MKV22LL/A"
];
UserPrefs.StoresInterestedIn = [
	"R317",
	"R154",
	"R199",
	"R189",
	"R171"
];



AvailabilityApi.StoreMap = require('./apple-store-map.json');

AvailabilityApi.ModelMap = require('./model-map.json');

AvailabilityApi.GetiPhoneAvailability = function(then, error)
{
	var url = 'https://reserve.cdn-apple.com/US/en_US/reserve/iPhone/availability.json';
	http.get(url, function(res) {
	    var body = '';

	    res.on('data', function(chunk) {
	        body += chunk;
	    });

	    res.on('end', function() {
	        var jsonResponse = JSON.parse(body)
	        then(jsonResponse);
	    });
	}).on('error', function(e) {
		if (error)
			error(e);
	});
};

AvailabilityApi.FriendlyNameForModel = function(model) {

	for (modelLookup in AvailabilityApi.ModelMap) {
		if (model.substring(0,4)===modelLookup.substring(0,4)) {
			return AvailabilityApi.ModelMap[modelLookup];
		}
	}

	return model;
};

AvailabilityApi.FriendlyNameForStore = function(storeId) {
	if (AvailabilityApi.StoreMap.hasOwnProperty(storeId))
	{
		return AvailabilityApi.StoreMap[storeId];
	}
	return storeId;
};

var GetStoresWithAvailabilityStatus = function(availability)
{
	var stores = [];
	for (prop in availability)
	{
		if (typeof(prop)==="string" && prop.length>0 && prop[0]==="R")
		{
			var availabilityArray = [];
			for (avail in availability[prop])
			{
				if (avail !== 'timeSlot')
					availabilityArray.push({Model: avail, Available: availability[prop][avail]});
			}
			stores.push({ StoreId: prop, Availability: availabilityArray});
		}
	}
	return stores;
};

var LastMessageSent = '';

var FindStoresWithStockContinuously = function()
{
	AvailabilityApi.GetiPhoneAvailability(function (availability) {
		console.log('---------------------------------------------------------------');

		var dateMessage = "unknown time";
		if (availability.updated)
		{
			var dateUpdated = new Date(availability.updated);
			dateMessage = dateUpdated.getHours().toString() + ':' + dateUpdated.getMinutes().toString() + ':' + dateUpdated.getSeconds().toString();
		}
		console.log('iPhone Stock Availability was last updated: ' + dateMessage);

		var storesWithAvailabilityStatus = GetStoresWithAvailabilityStatus(availability);

		var subject = '';
		var message = '';

		if (storesWithAvailabilityStatus.length===0) {
			subject = "The Apple stock availability checker is down.";
			message += "There are no stores or stock status being reported. This could mean the system is about to be updated.";
		}
		else {
			var storesWithStock = [];
			storesWithAvailabilityStatus.forEach(function (store) {

				if (UserPrefs.StoresInterestedIn.length === 0 || UserPrefs.StoresInterestedIn.contains(store.StoreId)) {
					for (model in store.Availability) {
						var thisModelAvail = store.Availability[model];
						if (UserPrefs.ModelsInterestedIn.contains(thisModelAvail.Model) && thisModelAvail.Available !== "NONE") {
							storesWithStock.push(store);
							break;
						}
					}
				}
			});

			subject = 'Found ' + storesWithStock.length + ' stores with stock (' + dateMessage + ')';

			storesWithStock.forEach(function (store) {
				message += '---------\n';
				message += AvailabilityApi.FriendlyNameForStore(store.StoreId) + '\n';
				store.Availability.forEach(function (stockCheck) {
					if (UserPrefs.ModelsInterestedIn.contains(stockCheck.Model) && stockCheck.Available !== "NONE") {
						message += ' -' + AvailabilityApi.FriendlyNameForModel(stockCheck.Model) + '\n';
					}
				});
			});
		}
		console.log(subject);
		console.log(message);

		if (LastMessageSent!==message) {
			LastMessageSent=message;
			sendNotifications.notifyStockToAllSubscribers(subject, message);
		}

		//FindStoresWithStock(storesWithAvailabilityStatus);

		setTimeout(FindStoresWithStockContinuously, 20000);
	});


};
sendNotifications.notifyStockToAllSubscribers('Startup', 'Apple Stock Checker Started up!');
FindStoresWithStockContinuously();
