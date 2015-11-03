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
    //var network = 'liveNetwork';
    var network = 'testNetwork';
    var hostname = 'horizon.stellar.org'

    if (network = 'liveNetwork') {
        StellarSdk.Network.usePublicNetwork();
        hostname = 'horizon.stellar.org'
    }

    var server = new StellarSdk.Server({ hostname: hostname, secure: true, port: 443 });
  		
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
		
	return {
        getServer : function(){
            return server;
        },
		isConnected : function(){
			return true;
		},
		init : function(){
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
 	var keysString = window.localStorage['keysXLM'];
    //keysString = null;
 	//window.localStorage.removeItem('keysArchive');

	// override for use in test network (funded)
	var testKeys = {
		address : 'GALYYRH5XCRLVQ3W56PNEZHRV37GY3VFRRFUYU4NNDKOGUAB22OQPUX4', // klopper
		secret : 'SDL3VTYAPQCOJDKA34WGXOIJA4RRQ6TAF5NJSVI77KEKP22L2GLIM6GN'
	};
	var testKeysAlternative = {
		address : 'GC7DJUFVMD5BYXS67MWAAQSJF6UASF47RY2AUCKOR5J2YTWS6ZNIGS6Y', // centaurus
		secret : 'SCYSM54HM3DAFLD4RCB6KXKWGPYTD7LYESTLTTVH5ER5T3BMN4I67QKY'
	};

	//keysString = JSON.stringify(testKeys);
//    window.localStorage['keys'] = keysString;
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
		window.localStorage['keysXLM'] = JSON.stringify(keys);
		keys.mode = 'created';
		settings.onKeysAvailable();
	};

	settings.init = function () {
		if (!keysString) {
            var keyPair = StellarSdk.Keypair.random();
            setKeysFunc(keyPair.address(), keyPair.seed());

//            // mock with specific address (remain in local storage)
//			 var mock = testKeys;
//			 setKeysFunc(mock.address, mock.secret);

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

		getKeyPair: function() {
		    return StellarSdk.Keypair.fromSeed(keys.secret);
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
			if(window.cordova && window.cordova.plugins && window.cordova.plugins.barcodeScanner){
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
			    var mockResult = { cancelled: false, text: 'GDPXFOKFCMPKLRYHL7UTFD2JNTLT26GXKT5LS6CAMBP6L2U3SKL3YIIG' }; 
				success(mockResult);
			}
		}
	};
})
