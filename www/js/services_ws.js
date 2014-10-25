angular.module('starter.services', [])

.factory('Account', function ($rootScope, UIHelper, Settings, Remote) {
	var keys;
	var account;
	account = {
		address : 'loading',
		balance : 0,
		reserve : 20,
		transactions : []
	};

	Remote.init(function () {
		Settings.get().onKeysAvailable = function () {
			keys = Settings.getKeys();
			account.address = keys.address;
			// initial balance
			var data = {
				command : 'account_info',
				account : keys.address
			};
			Remote.send(data);

			//initial transactions
			var data = {
				command : 'account_tx',
				account : keys.address,
				limit : 30
			};
			Remote.send(data);

			// subscribe for updates
			data = {
				command : 'subscribe',
				accounts : [keys.address]
			};
			Remote.send(data);
		};

		Settings.get().init();
	});

	var transactionFilter = function(msg){
		return (msg.engine_result_code == 0 && msg.type === 'transaction');
	};
	var transactionCallback = function(msg){
		account.transactions.unshift(msg.transaction);
		$rootScope.$broadcast('accountInfoLoaded');
	}
	Remote.addMessageHandler(transactionFilter, transactionCallback);
	
	var paymentFilter = function(msg){
		return (transactionFilter(msg) && msg.transaction.TransactionType === 'Payment')
	};
	var paymentCallback = function(msg){
		if (msg.transaction.Destination === keys.address) {
			if (!msg.transaction.Amount.issuer) {
				console.log('payment received: ' + msg.transaction.Amount / 1000000 + ' STR');
				account.balance += msg.transaction.Amount / 1000000;
			} else {
				console.log('payment received: ' + msg.transaction.Amount.value + ' ' + msg.transaction.Amount.currency);
			}
		} 
		else if (msg.transaction.Account === keys.address) {
			if (!msg.transaction.Amount.issuer) {
				console.log('payment sent: ' + msg.transaction.Amount / 1000000 + ' STR');
				account.balance -= msg.transaction.Amount / 1000000;
			} else {
				console.log('payment sent: ' + msg.transaction.Amount.value + ' ' + msg.transaction.Amount.currency);
			}
			UIHelper.blockScreen('Payment successful!', 1);
		}
	};	
	Remote.addMessageHandler(paymentFilter, paymentCallback);

	var successFilter = function(msg){
		return (msg.status === 'success' && msg.type === 'response' && msg.result);
	};
	var successCallback = function(msg){
		if (msg.result.account_data) {
			var newData = msg.result.account_data;
			account.balance = Math.round(newData.Balance / 1000000);
		}
		else if (msg.result.master_seed) {
			var newKeys = msg.result;
			console.log(newKeys.account_id + ': ' + newKeys.master_seed);
			Settings.setKeys(newKeys.account_id, newKeys.master_seed);
		} else if (msg.result.transactions) {
			var transactions = msg.result.transactions;
			for (index = 0; index < transactions.length; ++index) {
				account.transactions.push(transactions[index].tx);
			}
		}
		$rootScope.$broadcast('accountInfoLoaded');
	};
	Remote.addMessageHandler(successFilter, successCallback);

	return {
		get : function () {
			return account;
		}
	}
})

.factory('Remote', function (UIHelper) {
	var ws = new WebSocket('wss://test.stellar.org:9001');
	var messageHandlers = [];
	messageHandlers.add = function(filter, callback){
		messageHandlers.push( { filter: filter, callback: callback } );
	};
	
	var ignoreErrors = ['actNotFound', 'srcActNotFound'];	
	var errorFilter = function(msg) {
		if(msg.status !== 'error') return false; 		
		for(var i=0; i < ignoreErrors.length; i++){
			if(msg.error === ignoreErrors[i]) return false;
		}
		return true;
	};
	var errorCallback = function(msg) {		
		UIHelper.showAlert(msg.error_message);
	};	
	messageHandlers.add(errorFilter, errorCallback);
	
	var engineErrorFilter = function(msg) {
		if(!msg.result) return false;
		return (msg.result.engine_result_code && msg.result.engine_result_code != 0);
	};
	var engineErrorCallback = function(msg) {
		UIHelper.showAlert(msg.result.engine_result_message);
	};	
	messageHandlers.add(engineErrorFilter, engineErrorCallback);
	
	
	ws.onmessage = function(event){
		console.log(event.data)
		var msg = JSON.parse(event.data);
		for (var i=0; i < messageHandlers.length; i++) {
			var handler = messageHandlers[i];
			if(handler.filter(msg)) {
				handler.callback(msg);
			}
		}
	};

	return {
		get : function () {
			return ws;
		},
		init : function (callback) {
			try	{
				ws.onopen = function () {
					console.log('ws connection open');
					callback();
				}
				ws.onerror = function () {
					UIHelper.showAlert('Network connection failed');
				}
			}
			catch(ex){
				log.error('Network initialization failed', ex.message);
				UIHelper.showAlert(ex.message);
			}
		},
		send : function (data) {
			try	{
				ws.send(JSON.stringify(data));
			}
			catch(ex){
				log.error('Network communication failed', ex.message);
				UIHelper.showAlert(ex.message);
			}
		},
		addMessageHandler: messageHandlers.add
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

	settings.onKeysAvailable = function () {
		console.log('keys available not defined yet');
	}

	var setKeysFunc = function (addr, s) {
		keys = {
			address : addr,
			secret : s
		};
		window.localStorage['keys'] = JSON.stringify(keys);
		keys.mode = 'created';
		settings.onKeysAvailable();
	};

	settings.init = function () {
		if (!keysString) {
			// real api call
			var data = {
				command : 'create_keys'
			};
			Remote.get().send(JSON.stringify(data));

			// // mock with specific address
			// var mock = testKeys;
			// setKeysFunc(mock.address, mock.secret);

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
			setKeysFunc(addr, s);
		},

		get : function () {
			return settings;
		}
	}
})

.factory('QR', function () {

	return {
		scan : function (success, fail) {
			// real scan on device
			cordova.plugins.barcodeScanner.scan(
				function (result) {
				success(result);
			},
				function (error) {
				fail(error);
			});

			// // mock scan for dev purposes
			// var mockResult = { cancelled: false, text:'gEPLboQjouwdRBoVzi8vwLd2SWjZa3xcTL' };
			// success(mockResult);
		}
	};
})

.factory('Commands', function (UIHelper, Settings, Account) {

	if (typeof String.prototype.startsWith != 'function') {
		String.prototype.startsWith = function (str){
			return this.slice(0, str.length) == str;
		};
	}
	
	var knownCommands = [];
	knownCommands.add = function(commandName, callback){
		knownCommands.push( { name: commandName, callback: callback } );
	};
	
	var backupCallback = function(content){
			var unmasked = atob(content);
			var newKeys = JSON.parse(unmasked);
			var oldKeys = Settings.getKeys();
			
			if(oldKeys.address == newKeys.address && oldKeys.secret == newKeys.secret) {
				UIHelper.showAlert('The keys have been restored correctly but did not change since your last backup.');
			}
			else {
				var doOverwrite = function(){
					Settings.setKeys(newKeys.address, newKeys.secret);
					UIHelper.showAlert('The keys have been restored');
				};

				if(Account.get().balance > 0) {
					UIHelper.confirmAndRun(
						'Overwrite Keys', 
						'This will overwrite your existing keys. If you don not have a backup, the remaining funds on the old address are lost!',
						doOverwrite
					);
				}
				else{
					doOverwrite();
				}
			}
			
			return true;
	}
	knownCommands.add('backup001', backupCallback);

	return {
		parse : function (input) {
			var result = {
				isCommand : false,
				rawCommand: ''
			}
			if(input.startsWith('centaurus:')){
				result.isCommand =  true;
				result.rawCommand = input.substring(10);
			}
			return result;
		},
		
		execute : function (rawCommand) {
			var result = {
				success : false,
				commandName : 'unknownCommand'
			}			
			for (var i=0; i < knownCommands.length; i++) {
				var command = knownCommands[i];
				if(rawCommand.startsWith(command.name)) {
					result.commandName = command.name;
					result.success = command.callback(rawCommand.substring(command.name.length));					
				}
			}
		}
	};
})

.factory('UIHelper', function($rootScope, $ionicLoading, $ionicPopup, $timeout){
	return {
		showAlert : function(caption){
			$ionicLoading.hide();
			$ionicPopup.alert({
				title : caption
			})
		},
		confirmAndRun : function(caption, text, onConfirm){
			$ionicLoading.hide();
			var popup = $ionicPopup.confirm({
				title : caption,
				template : text
			});
			popup.then(function(res){
				if(res){
					onConfirm();
				}
			});
		},
		blockScreen: function(text, timeoutSec){
			$ionicLoading.show({
				template : text
			});
			$timeout(function () {
				$ionicLoading.hide();
			}, timeoutSec * 1000);
		}
	};
})