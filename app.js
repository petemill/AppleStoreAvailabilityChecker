var http = require('https');
var sendNotifications = require('./aws-sns-notify.js');

var AvailabilityApi = {};

AvailabilityApi.StoreMap = require('./apple-store-map.json');

AvailabilityApi.ModelMap = require('./model-map.json');

AvailabilityApi.GetiPhoneUKAvailability = function(then, error)
{
	var url = 'https://reserve.cdn-apple.com/GB/en_GB/reserve/iPhone/availability.json';
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

var PrintAvailabilityUpdatedDate = function(availability)
{
	console.log('iPhone Stock Availability was last updated: ' + new Date(availability.updated).toString());
};

var LastMessageSent = '';

var FindStoresWithStock = function(storesWithAvailability)
{
	var message = '';

	var storesWithStock = [];
	storesWithAvailability.forEach(function (store) {
		for (model in store.Availability) {
			//console.log(typeof(store.Availability[model].Available));
			if (store.Availability[model].Available===true) {
				storesWithStock.push(store);

				break;
			}
		}
	});

	subject = 'Found ' + storesWithStock.length + ' stores with stock';
	message += subject + '.\n';
	
	storesWithStock.forEach(function (store) {
		message += '---------\n';
		message += AvailabilityApi.FriendlyNameForStore(store.StoreId) + '\n';
		store.Availability.forEach(function (stockCheck) {
			if (stockCheck.Available===true) {
				message += ' -' + AvailabilityApi.FriendlyNameForModel(stockCheck.Model) + '\n';
			}
		});
	});
	
	console.log(message);
	if (LastMessageSent!==message) {
		LastMessageSent=message;
		sendNotifications.notifyStockToAllSubscribers(subject, message);
	}

	return storesWithStock;
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
				availabilityArray.push({Model: avail, Available: availability[prop][avail]});
			}
			stores.push({ StoreId: prop, Availability: availabilityArray});
		}
	}
	return stores;
};

var FindStoresWithStockContinuously = function()
{
	AvailabilityApi.GetiPhoneUKAvailability(function (availability) {
		console.log('---------------------------------------------------------------')
		PrintAvailabilityUpdatedDate(availability);
		var storesWithAvailabilityStatus = GetStoresWithAvailabilityStatus(availability);
		FindStoresWithStock(storesWithAvailabilityStatus);

		setTimeout(FindStoresWithStockContinuously, 20000);
	});

	
};

FindStoresWithStockContinuously();