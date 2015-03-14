angular.module('starter.controllers', [])
.controller('WalletCtrl', function ($scope, $ionicPopup, UIHelper, Account, QR, Commands, Settings) {
	$scope.$on('accountInfoLoaded', function (event) {
		$scope.account = Account.get();
		$scope.$apply();
	});
	$scope.account = Account.get();
	
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
})

.controller('SendCtrl', function ($scope, UIHelper, Account, Remote, Settings, QR, Commands) {
	var account = Account.get();
	$scope.$on('accountInfoLoaded', function (event) {
		account = Account.get();
		$scope.available = account.balance - account.reserve;
		$scope.account = account;
		$scope.$apply();
	});

	$scope.available = account.balance - account.reserve;
	$scope.account = account;
	$scope.paymentData = {
		destinationAddress : '',
		amount : null,
		currency : 'STR'
	}

	$scope.sendPayment = function () {
		var keys = Settings.getKeys();
		var data = {
			command : 'submit',
			tx_json : {
				TransactionType : 'Payment',
				Account : keys.address,
				Destination : $scope.paymentData.destinationAddress,
				Amount : '',
			},
			secret : keys.secret
		};
        if($scope.paymentData.currency == 'STR') {
            if($scope.paymentData.amount > account.balance) {
                UIHelper.showAlert('Insufficient Funds');
                return;
            }
            data.tx_json.Amount = ($scope.paymentData.amount*1000000).toString();
        }
        else {
            data.tx_json.Amount = { 
                currency : $scope.paymentData.currency, 
                value : amountString,
                issuer : 'gHBsnApP6wutZweigvyADvxHmwKZVkAFwY'
            };
        }
		UIHelper.blockScreen("To the moon...", 12);
		Remote.send(data);
	};
	
	$scope.scanCode = function () {
	
		// var text = 'centaurus:backup001eyJhZGRyZXNzIjoiZ0VQTGJvUWpvdXdkUkJvVnppOHZ3TGQyU1dqWmEzeGNUTCIsInNlY3JldCI6InNmbUIzNEFNdUFQcmdiZ2VGSjdpWHhpMTROYUt4UWZjWG9FZXgzcDRUcWVrQWd2aW5oYSIsIm1vZGUiOiJsb2FkZWQifQ==';
		// // var text = 'centaurus:backup001eyJhZGRyZXNzIjoiZzN2Ynl1azJyYnZMTkVkRGVrY3JFaE1xUWl4bVExUThWeiIsInNlY3JldCI6InNmRXBtMzlwdEJjWFc4c21zUnlCRnZKaWVXVGQ0WG05MUc4bkh0cGVrV2Z3UnpvZTFUUCIsIm1vZGUiOiJsb2FkZWQifQ==';
		// var cmd = Commands.parse(text);					
		// if(cmd.isCommand){
			// Commands.execute(cmd.rawCommand);
		// }
		QR.scan(
			function (result) {
				if (!result.cancelled) {
					var cmd = Commands.parse(result.text);					
					if(cmd.isCommand) {
						Commands.execute(cmd.rawCommand);
					}
					else {
                        $scope.paymentData.destinationAddress = result.text;
                    }
                    $scope.$apply();					
				}
			},
			function (error) {
				UIHelper.showAlert("Scanning failed: " + error);
			}
		);
	};

	$scope.donate = function () {
		$scope.paymentData = {
			destinationAddress : 'gwhiWKCTvS8Mb5kZeGygeiyQKmFTUJfN1D',
			amount : Math.floor(0.01 * account.balance),
			currency : 'STR'
		}
	};
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