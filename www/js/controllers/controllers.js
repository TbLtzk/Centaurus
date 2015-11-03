angular.module('starter.controllers', [])
.controller('WalletCtrl', function ($scope, $ionicPopup, $http, UIHelper, Account, QR, Commands, Settings) {
	$scope.$on('accountInfoLoaded', function (event) {
		$scope.account = Account.get();
		$scope.$apply();
	});
	$scope.account = Account.get();
	$scope.Math = window.Math;
    	
	$scope.shareKeys = function () {
		var onPassword = function(pwd){
			var plain = JSON.stringify(Settings.getKeys());
			var backupString = CryptoJS.AES.encrypt(plain, pwd);

			body = 'centaurus:backup002' + backupString;
			UIHelper.shareText('My Stellar Keys', body);
		};
		UIHelper.promptForPassword(function(pwd){
			if(pwd == ''){
				UIHelper.confirmAndRun('Unencrypted Backup', 
					'You are about to create an unencrypted backup. Anyone with access to the backup can access your funds, so keep it safe!',
					function(){
						onPassword(pwd);
					});
			}
			else
				onPassword(pwd);
		});
	};
	
	$scope.scanCommand = function(){
		QR.scan(
			function (result) {
				if (!result.cancelled) {
					
					var cmd = Commands.parse(result.text);					
					if(cmd.isCommand){
						Commands.execute(cmd.rawCommand);
						$scope.myPopup.close();
					}
					else
						UIHelper.showAlert('Not a valid backup qr code');
				}
			},
			function (error) {
				UIHelper.showAlert("Scanning failed: " + error);
			}
		);
	}

	$scope.importKeys = function () {
	  $scope.data = {}	  
	  $scope.myPopup = $ionicPopup.show({
		templateUrl: 'templates/importKeys.html',
		title: 'Enter your wallet backup string',
		subTitle: 'or plain key pair',
		scope: $scope,
		buttons: [
		  { text: 'Cancel' },
		  {
			text: '<b>Import</b>',
			type: 'button-positive',
			onTap: function(e) {
				var cmd = Commands.parse($scope.data.backupCommandString);					
				if(cmd.isCommand){
					return Commands.execute(cmd.rawCommand);
				}
				else if($scope.data.address && $scope.data.secret)
				{
					// TODO: validate address and secret
					return Commands.importAddressAndSecret($scope.data.address, $scope.data.secret);
				}
				else{
					UIHelper.showAlert('Not a valid backup string or key pair!');
					e.preventDefault();
				}
			}
		  },
		]
	  });
	};

	if (!window.localStorage['keysArchive'])
	    $scope.showUpgrade = true;
	$scope.upgrade = function () {
	    var newKeys = Settings.getKeys();
	    var oldKeys = JSON.parse(window.localStorage['keys']);

	    //var newKeys = {
	    //    address: 'GALYYRH5XCRLVQ3W56PNEZHRV37GY3VFRRFUYU4NNDKOGUAB22OQPUX4',
	    //    secret: 'SDL3VTYAPQCOJDKA34WGXOIJA4RRQ6TAF5NJSVI77KEKP22L2GLIM6GN'
	    //};
	    //var oldKeys = {
	    //    address: 'gEPLboQjouwdRBoVzi8vwLd2SWjZa3xcTL',
	    //    secret: 'sfmB34AMuAPrgbgeFJ7iXxi14NaKxQfcXoEex3p4TqekAgvinha'
	    //};

	    var data = JSON.stringify({
	        newAddress: newKeys.address
	    });
	    var keypair = StellarSdk.Keypair.fromBase58Seed(oldKeys.secret);
	    var publicKey = nacl.util.encodeBase64(keypair.rawPublicKey());
	    var signatureRaw = keypair.sign(data);
	    var signature = nacl.util.encodeBase64(signatureRaw) + 'invalidate';
	    var message = {
	        data: data,
	        publicKey: publicKey,
	        signature: signature
	    };
        
	    $http.post('https://api.stellar.org/upgrade/upgrade', message).then(function (resp) {
	        // For JSON responses, resp.data contains the result
	        console.log('Success', resp);
	        window.localStorage['keysArchive'] = JSON.stringify(oldKeys);
	        $scope.showUpgrade = false;
	        UIHelper.showAlert('Welcome to Stellar-Core. Your STR have been converted to XLM!');
	        $scope.apply();
	    }, function (err) {
	        // err.status will contain the status code
	        if (err.status)
	            UIHelper.showAlert(err.status + ': ' + err.statusText + '. ' + JSON.stringify(err.data));
	        else     
	            UIHelper.showAlert(JSON.stringify(err));
	    });
	}
})

.controller('ReceiveCtrl', function ($scope, Account, UIHelper) {
	$scope.$on('accountInfoLoaded', function (event) {
		$scope.account = Account.get();
		$scope.$apply();
	});
	$scope.account = Account.get();
	new QRCode(document.getElementById("QRCODE"), {
		width : 128,
		height : 128,
		text : Account.get().address
	});
	$scope.share = function () {
		UIHelper.shareText('My Stellar Address', 'You can send me Stellars to the address ' + $scope.account.address + '.\n\nCentaurus - Stellar Wallet for Android!');
	}
})

.controller('TransactionsCtrl', function ($scope, Account) {	
	$scope.$on('accountInfoLoaded', function (event) {
		$scope.account = Account.get();
		$scope.$apply();
	});
	$scope.account = Account.get();
})

.controller('AboutCtrl', function ($scope) {	
});