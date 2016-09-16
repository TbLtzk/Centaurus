angular.module('starter.services.basic', [])

.factory('UIHelper', function($rootScope, $ionicLoading, $ionicPopup, $timeout, $translate){
	return {
	    showAlert: function (captionRes, plainSuffix) {
	        console.log(captionRes);
	        $translate(captionRes).then(function (caption) {
	            if (plainSuffix)
                    caption+=plainSuffix;
                $ionicLoading.hide();
                $ionicPopup.alert({
                    title: caption
                })
            });
		},
	    promptForPassword: function (onOk, freeChoice) {
	        var titleText = freeChoice ? 'services.uiHelper.password.title.choose' : 'services.uiHelper.password.title.enter';
	        var placeholderText = freeChoice ? 'services.uiHelper.password.placeholder.choose' : 'services.uiHelper.password.placeholder.enter';
	        this.translate([titleText, placeholderText, 'general.btn.ok', 'general.btn.cancel']).then(function (t) {
	            $ionicPopup.prompt({
	                title: t[0],
	                inputType: 'password',
	                inputPlaceholder: t[1],
	                okText: t[2],
	                cancelText: t[3]
	            }).then(function (res) {
	                if (res || res == '') {
	                    onOk(res)
	                }
	            });
	        });
		},
		confirmAndRun: function (captionRes, textRes, onConfirm) {
		    this.translate([captionRes, textRes, 'general.btn.ok', 'general.btn.cancel']).then(function (t) {
		        $ionicLoading.hide();
		        var popup = $ionicPopup.confirm({
		            title: t[0],
		            template: t[1],
		            okText: t[2],
		            cancelText: t[3]
		        });
		        popup.then(function (res) {
		            if (res) {
		                onConfirm();
		            }
		        });
		    });
		},
		blockScreen: function (textRes, timeoutSec) {
		    $translate(textRes).then(function (text) {
		        $ionicLoading.show({
		            template: text
		        });
		        $timeout(function () {
		            $ionicLoading.hide();
		        }, timeoutSec * 1000);
		    });
		},
		shareText: function(captionRes, textRes){
		    $translate([captionRes, textRes]).then(function (translations) {
		        var caption = translations[captionRes];
		        var text = translations[textRes];
		        if (window.plugins) {
		            window.plugins.socialsharing.share(text, caption);
		        }
		        else {
		            var subject = caption.replace(' ', '%20').replace('\n', '%0A');
		            var body = text.replace(' ', '%20').replace('\n', '%0A');
		            window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
		        }
		    });
		},
		translate : function(keys){
		    var promise = new Promise(function (resolve, reject) {
		        $translate(keys).then(function (translations) {
		            var t = [];
		            for (i = 0; i < keys.length; i++) {
		                var key = keys[i];
		                t.push(translations[key]);
		            }
		            resolve(t);
		        })
		        .catch(reject);
		    });
		    return promise;
		},
		getCurrentLanguage: function () {
		    return $translate.use();
		},
	    changeLanguage: function(newLang){
	        $translate.use(newLang);
	    }
	};
})

.factory('Remote', function (UIHelper) {
    //var network = 'liveNetwork';
    var network = 'testNetwork';
    var url = 'https://horizon-testnet.stellar.org';

    if (network === 'liveNetwork') {
        StellarSdk.Network.usePublicNetwork();
        url = 'https://horizon.stellar.org'
    }

    var server = new StellarSdk.Server(url);
  		
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
 	//window.localStorage.removeItem('keys');

 	var keypair;
	//keypair = StellarSdk.Keypair.fromSeed('SDL3VTYAPQCOJDKA34WGXOIJA4RRQ6TAF5NJSVI77KEKP22L2GLIM6GN'); // customer - GALYYRH5XCRLVQ3W56PNEZHRV37GY3VFRRFUYU4NNDKOGUAB22OQPUX4
	//keypair = StellarSdk.Keypair.fromSeed('SCYSM54HM3DAFLD4RCB6KXKWGPYTD7LYESTLTTVH5ER5T3BMN4I67QKY'); // issuer - GC7DJUFVMD5BYXS67MWAAQSJF6UASF47RY2AUCKOR5J2YTWS6ZNIGS6Y
 	keypair = StellarSdk.Keypair.fromSeed('SCMJROJFDV4OP2NVJVHICY6S7ZL6Q6JFM6DLDN3DVFO5IQHR52LFQ7GB'); // trader - GDB5ASLR6TSSMVZ77RZZJP25VNT7E7VPUNEQFXGKG4TYZWHJHHGAEUEQ
    //keypair = StellarSdk.Keypair.random();

    if (keypair) {
        // override keys for testing
        testKeys = {
            address: keypair.accountId(),
            secret: keypair.seed(),
        };

        keysString = JSON.stringify(testKeys);
        // window.localStorage['keys'] = keysString;
    }

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
            setKeysFunc(keyPair.accountId(), keyPair.seed());
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
			    //var mockResult = { cancelled: false, text: 'centaurus\\:backup001eyJhZGRyZXNzIjoiZzN2Ynl1azJyYnZMTkVkRGVrY3JFaE1xUWl4bVExUThWeiIsInNlY3JldCI6InNmRXBtMzlwdEJjWFc4c21zUnlCRnZKaWVXVGQ0WG05MUc4bkh0cGVrV2Z3UnpvZTFUUCIsIm1vZGUiOiJsb2FkZWQifQ==' }; 
			    //var mockResult = { cancelled: false, text: 'centaurus:backup002U2FsdGVkX193Y6v8tRURhD7dfYhdJ7IS6h94qj5xWMwGNYRANdA8NBm6xHfz1mzP+oVStbyzXP46osbM2r1V6cE5QzlZb3LFEQfVyYbuvet6EVgvIBkjMu2lIqFSlvgQNbuxPbppkKp1g7RIA41Qbw5fUlHP2uFLJ+v9Syhc1OICl8K80BXah+07rjOZcL8z' }; // käse
			    var mockResult = { cancelled: false, text: 'centaurus:backup003U2FsdGVkX18DZkB6ZdF8a7vl8/k2SRasAbbG2bojaQOqGGhLL4ea/gA6YY6XNXrrMd8XX0L9NunvYCDhNaKGc/W14GPpDJrNWBg4zpkjT/9ICQsCoSiuY8CtvTvgqAONnql/va6k/hqzsVZBnl7UzK9bngIxDQVWuMqgLTO+mwpmTciax/7RHngYoLT2/KSa8sCPF8QhItN6eeVMygr1048ywDEgVJb/3fmJOrJBvmM=' }; // käse
			    //var mockResult = { cancelled: false, text: 'GDPXFOKFCMPKLRYHL7UTFD2JNTLT26GXKT5LS6CAMBP6L2U3SKL3YIIG' }; 
			    //var mockResult = { cancelled: false, text: 'centaurus\\:redeemSTR001sfmB34AMuAPrgbgeFJ7iXxi14NaKxQfcXoEex3p4TqekAgvinha' };
				success(mockResult);
			}
		}
	};
})
