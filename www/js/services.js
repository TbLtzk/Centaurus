angular.module('starter.services', [])

.factory('Account', function ($rootScope, $ionicLoading, Settings, Remote) {
	$ionicLoading.show({
		template : "Loading..."
	});
	var keys;
	var remote;
	var account;

	var updateAccountInfo = function () {
		var request = remote.requestAccountInfo(account.address, function (err, res) {
				if (err) {
					console.error('Could not retrieve account info for account: ' + address)
					console.error(err)
				} else {
					console.log('accountInfoLoaded');
					account.balance = res.account_data.Balance / 1000000;
				}
				$rootScope.$broadcast('accountInfoLoaded');
			})
			request.request();
	};

	Settings.get().init(function () {
		keys = Settings.getKeys();
		remote = Remote.get();

		account = {
			address : keys.address,
			balance : 0,
			reserve : 20,
			devInfo : keys
		};

		updateAccountInfo(); // initial account info

		remote.on('ledger_closed', function (data) {
			updateAccountInfo(); // update account info
		});

		$ionicLoading.hide();
	});

	return {
		get : function () {
			return account;
		}
	}
})

.factory('Remote', function () {
	var Remote = stellar.Remote;

	var remote = new Remote({
			// see the API Reference for available options
			trusted : true,
			local_signing : true,
			local_fee : true,
			fee_cushion : 1.5,
			servers : [{
					host : 'test.stellar.org',
					port : 9001,
					secure : true
				}
			]
		});

	remote.connect(function () {
		console.log('remote connected')
	});

	return {
		get : function () {
			return remote;
		}
	}
})

.factory('Settings', function (Remote) {
	var Request = stellar.Request;
	var remote = Remote.get();

	var keysString = window.localStorage['keys'];

	// override for use in test network (funded)
	var testKeys = {
		address : 'gHBsnApP6wutZweigvyADvxHmwKZVkAFwY',
		secret : 's3qgYLVJQJL2eLZ54TB9msjmpRHXQBdQrmG9WbD6yVCx6NrFMYU'
	};
	var testKeysAlternative = {
		address : 'gEPLboQjouwdRBoVzi8vwLd2SWjZa3xcTL',
		secret : 'sfmB34AMuAPrgbgeFJ7iXxi14NaKxQfcXoEex3p4TqekAgvinha'
	};
	//keysString = JSON.stringify(testKeys);

	var settings = this;
	var keys;
	var defaultKeys = {
		address : 'gEux6NhrybVLuvgaYrgThTk4d3Kmd3s4NP',
		secret : 'mySecret'
	};
	defaultKeys = testKeys;

	settings.create_keys = function (callback) {

		keys = defaultKeys;
		remote.connect(function () {
			var request = new Request(remote, 'create_keys').callback(function (res, success, error) {
					keys.address = success.account_id;
					keys.secret = success.master_seed;

					window.localStorage['keys'] = JSON.stringify(keys);
					keys.mode = 'created';

					remote.set_secret(keys.address, keys.secret);
					callback(settings);
				})

				request.request();
		});
	};

	settings.init = function (callback) {
		if (!keysString) {
			settings.create_keys(callback)
		} else {
			keys = JSON.parse(keysString);
			keys.mode = 'loaded';
			remote.set_secret(keys.address, keys.secret);
			callback(settings)
		}
	};

	return {
		getKeys : function () {
			return keys;
		},
		get : function () {
			return settings;
		}
	}
});
