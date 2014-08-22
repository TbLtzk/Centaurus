angular.module('starter.services', [])

.factory('Account', function ($rootScope, $ionicLoading, Settings, Remote) {
	var keys;
	var account;
	account = {
		address : 'loading',
		balance : 0,
		reserve : 20,
		devInfo : keys
	};

	var ws = Remote.get();
	Remote.init(function () {
	    Settings.get().onKeysAvailable = function () {
			keys = Settings.getKeys();
			account.address = keys.address;
			// initial balance
			var data = {
			  command: 'account_info',
			  account: keys.address
			};	 
			ws.send( JSON.stringify( data ) );

			// subscribe for updates
			data = {
			  command: 'subscribe',
			  accounts: [ keys.address ]
			};	 
			ws.send( JSON.stringify( data ) );
		};
		
		Settings.get().init();		
	});

    ws.onmessage = function (event) {
	  var msg=JSON.parse(event.data);
	  console.log( msg );
	  if(msg.engine_result_code === 0 && msg.type === 'transaction') {		
		if( msg.transaction.Destination === keys.address) {
		  console.log( 'payment received: ' + msg.transaction.Amount/1000000 + ' STR' );
		  account.balance += msg.transaction.Amount/1000000;
		} 
		else if( msg.transaction.Account === keys.address) {
		  console.log( 'payment sent: ' + msg.transaction.Amount/1000000 + ' STR' );
		  account.balance -= msg.transaction.Amount/1000000;
		  $ionicLoading.hide();
		}
	  }
	  else if (msg.status === 'success' && msg.type === 'response' && msg.result){		 
		if(msg.result.account_data) {
		  var newData = msg.result.account_data;
		  account.balance = newData.Balance / 1000000;
		}
		// else if(msg.result.transaction)
		// { 		
			// var t = msg.result.transaction;
			// if(t.
		  // account.balance += msg.transaction.Amount/1000000;
			
		// }
		else if(msg.result.master_seed)
		{ 
		  var newKeys = msg.result;
		  console.log(newKeys.account_id + ': ' + newKeys.master_seed);
		  Settings.setKeys(newKeys.account_id, newKeys.master_seed);
		}
	  }
	  $ionicLoading.hide();
	  $rootScope.$broadcast('accountInfoLoaded');
	};

	return {
		get : function () {
			return account;
		}
	}
})

.factory('Remote', function () {
    var ws = new WebSocket('ws://test.stellar.org:9001');

	return {
		get : function () {
			return ws;
		},
		init : function(callback) {		
		  ws.onopen = function () {
			console.log('ws connection open');
		    callback();
		  }
		},		
		send : function (data) {
		  ws.send( JSON.stringify( data ) );
		}
	}
})

.factory('Settings', function (Remote) {
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
	// keysString = JSON.stringify(testKeysAlternative);

	var settings = this;
	var keys;
	var defaultKeys = {
		address : 'gEux6NhrybVLuvgaYrgThTk4d3Kmd3s4NP',
		secret : 'mySecret'
	};
	defaultKeys = testKeys;

	settings.onKeysAvailable = function()
	{
       console.log('keys available not defined yet');	
	}

	settings.init = function () {			
		if (!keysString) {
			var data = {
			  command: 'create_keys'
			};	 
			Remote.get().send( JSON.stringify( data ) );
			
		} else {
			keys = JSON.parse(keysString);
			keys.mode = 'loaded';
			settings.onKeysAvailable();
		}
	};

	return {
		getKeys : function () {
			return keys;
		},
		
		setKeys : function (addr, s) {
		  keys = {address: addr, secret: s};
		  window.localStorage['keys'] = JSON.stringify(keys);
		  keys.mode = 'created';
		  settings.onKeysAvailable();
		},
		
		get : function () {
			return settings;
		}
	}
});
