angular.module('starter.services.basic', [])

.factory('UIHelper', function($rootScope, $ionicLoading, $ionicPopup, $timeout){
	return {
		showAlert : function(caption){
			console.log(caption);
			$ionicLoading.hide();
			$ionicPopup.alert({
				title : caption
			})
		},
		promptForPassword : function(onOk){
			$ionicPopup.prompt({
				title: 'Enter Password',
				inputType: 'password',
				inputPlaceholder: 'Your password'
			}).then(function(res) {
				if(res || res == ''){
					onOk(res)
				}
			});			
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
		},
		shareText: function(caption, text){
			if(window.plugins){
				window.plugins.socialsharing.share(text, caption);
			}
			else{
				var subject = caption.replace(' ', '%20').replace('\n', '%0A');
				var body = text.replace(' ', '%20').replace('\n', '%0A');
				window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
			}
		}
	};
})

.factory('Remote', function (UIHelper) {
	var createWebsocket = function(){
		try	{	
			if (!("WebSocket" in window))
			{
				UIHelper.showAlert("ws NOT supported!");
				return null;
			}
			var ws = new WebSocket('wss://test.stellar.org:9001');
			
			ws.onmessage = function(event){
				// UIHelper.showAlert(event.data);
				console.log(event.data)
				var msg = JSON.parse(event.data);
				for (var i=0; i < messageHandlers.length; i++) {
					var handler = messageHandlers[i];
					if(handler.filter(msg)) {
						handler.callback(msg);
					}
				}
			};

			ws.onerror = function () {
				UIHelper.blockScreen('Network error occurred!', 5);
			};
			ws.onclose = function () {
				console.log('ws connection closed');
			};
			
			return ws;
		}
		catch(ex){
			console.log('Network initialization failed', ex.message);
			UIHelper.showAlert(ex.message);
		}
	};
    var server = new StellarSdk.Server({hostname:'horizon-testnet.stellar.org', secure: true, port: 443});
  		
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
	
	var ws = createWebsocket();
	
	return {
        getServer : function(){
            return server;
        },
		isConnected : function(){
			return true;
		},
		init : function(){
			ws = createWebsocket();
		},
		send : function (data) {
			try	{
				if(this.isConnected()) {
                    var msg = JSON.stringify(data);
                    console.log(msg);
					ws.send(msg);
                }
			}
			catch(ex){
				UIHelper.showAlert('Network communication failed: ' + ex.message);
			}
		},
		addMessageHandler: messageHandlers.add
	}
})

.factory('Settings', function (Remote) {
	var keysString = window.localStorage['keys'];

	// override for use in test network (funded)
	var testKeys = {
		address : 'GALYYRH5XCRLVQ3W56PNEZHRV37GY3VFRRFUYU4NNDKOGUAB22OQPUX4', // klopper
		secret : 'SDL3VTYAPQCOJDKA34WGXOIJA4RRQ6TAF5NJSVI77KEKP22L2GLIM6GN'
	};
	var testKeysAlternative = {
		address : 'gEPLboQjouwdRBoVzi8vwLd2SWjZa3xcTL',
		secret : 'sfmB34AMuAPrgbgeFJ7iXxi14NaKxQfcXoEex3p4TqekAgvinha'
	};

    keysString = JSON.stringify(testKeys);
    window.localStorage['keys'] = keysString;
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
			Remote.send(data);

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
			if(window.cordova && window.cordova.plugins.barcodeScanner){
				// real scan on device
				cordova.plugins.barcodeScanner.scan(
					function (result) {
					success(result);
				},
					function (error) {
					if(fail)
						fail(error);
				});
			}
			else{
				// mock scan for dev purposes
				// var mockResult = { cancelled: false, text:'centaurus\\:backup001eyJhZGRyZXNzIjoiZzN2Ynl1azJyYnZMTkVkRGVrY3JFaE1xUWl4bVExUThWeiIsInNlY3JldCI6InNmRXBtMzlwdEJjWFc4c21zUnlCRnZKaWVXVGQ0WG05MUc4bkh0cGVrV2Z3UnpvZTFUUCIsIm1vZGUiOiJsb2FkZWQifQ==' };
				var mockResult = { cancelled: false, text:'gEPLboQjouwdRBoVzi8vwLd2SWjZa3xcTL' };
				success(mockResult);
			}
		}
	};
})
