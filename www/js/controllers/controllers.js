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

	if (window.localStorage['keys'] && !window.localStorage['keysArchive'])
	    $scope.showUpgrade = true;
	$scope.upgrade = function () {
	    var oldKeys = JSON.parse(window.localStorage['keys']);
	    var onSuccess = function (resp) {
	        window.localStorage['keysArchive'] = JSON.stringify(oldKeys);
	        $scope.showUpgrade = false;
	        UIHelper.showAlert('Welcome to Stellar-Core. Your STR will be converted to XLM! You might need to close and reopen Centaurus.');
	        $scope.apply();
	    };
	    Commands.upgradeFromStr(oldKeys.secret, onSuccess);
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
    var onNewTransactions = function (event) {
        var account = Account.get();
        $scope.account = account;
        $scope.$apply();
    };
    $scope.$on('accountInfoLoaded', onNewTransactions);
    $scope.$on('newTransaction', onNewTransactions);
    $scope.account = Account.get();
})

.controller('AboutCtrl', function ($scope) {	
});