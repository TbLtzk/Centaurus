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

			body = 'centaurus:backup003' + backupString;
			UIHelper.shareText('controllers.wallet.shareKeys.message.caption', body);
		};
		UIHelper.promptForPassword(function(pwd){
			if(pwd == ''){
				UIHelper.confirmAndRun('controllers.wallet.shareKeys.unencrypted.caption', 
					'controllers.wallet.shareKeys.unencrypted.text',
					function(){
						onPassword(pwd);
					});
			}
			else
				onPassword(pwd);
		}, true);
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
						UIHelper.showAlert('controllers.wallet.scanCommand.invalidCode');
				}
			},
			function (error) {
			    console.log(error);
			    UIHelper.showAlert('controllers.wallet.scanCommand.scanFailed');
			}
		);
	}

	$scope.importKeys = function () {        
	    $scope.data = {};
	    UIHelper.translate(
            [ 'controllers.wallet.importKeys.popup.title'
            , 'controllers.wallet.importKeys.popup.subtitle'
            , 'general.btn.cancel'
            , 'general.btn.import'
            , 'controllers.wallet.importKeys.popup.invalid'
            ]).then(function (t) {
	        $scope.myPopup = $ionicPopup.show({
	            templateUrl: 'templates/importKeys.html',
	            title: t[0],
	            subTitle: t[1],
	            scope: $scope,
	            buttons: [
                  { text: t[2] },
                  {
                      text: '<b>' + t[3] + '</b>',
                      type: 'button-positive',
                      onTap: function (e) {
                          var cmd = Commands.parse($scope.data.backupCommandString);
                          if (cmd.isCommand) {
                              return Commands.execute(cmd.rawCommand);
                          }
                          else if ($scope.data.address && $scope.data.secret) {
                              // TODO: validate address and secret
                              return Commands.importAddressAndSecret($scope.data.address, $scope.data.secret);
                          }
                          else {
                              UIHelper.showAlert(t[4]);
                              e.preventDefault();
                          }
                      }
                  },
	            ]
	        });
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
	    UIHelper.translate(
            [ 'controllers.receive.share.title'
            , 'controllers.receive.share.p1'
            , 'controllers.receive.share.p2'
            ]).then(function (t) {
                UIHelper.shareText(t[0], t[1] + ' ' + $scope.account.address + '.\n\n' + t[2]);
	    });
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