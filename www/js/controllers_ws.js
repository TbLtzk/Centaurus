angular.module('starter.controllers', [])
.controller('WalletCtrl', function ($scope, Account) {
	$scope.$on('accountInfoLoaded', function (event) {
		$scope.account = Account.get();
		$scope.$apply();
	});
	$scope.account = Account.get();
})

.controller('SendCtrl', function ($scope, $ionicLoading, Account, Remote, Settings, QR) {
	var account = Account.get();
	$scope.$on('accountInfoLoaded', function (event) {
		account = Account.get();
		$scope.available = account.balance - account.reserve;
		$scope.account = account;
		$scope.$apply();
	});

	$scope.available = account.balance - account.reserve;
	$scope.account = account;

	$scope.sendPayment = function () {
		$ionicLoading.show({
			template : "To the moon..."
		});
		var data = {
		  command: 'submit',
		  tx_json : {
			TransactionType : 'Payment',
			Account : account.address,
			Destination : $scope.paymentData.destinationAddress,
			Amount : $scope.paymentData.amount * 1000000,			
		  },
		  secret : Settings.getKeys().secret
		};
		Remote.send(data);	
	};
	
	$scope.scanCode = function () {
		QR.scan(
		  function (result) {
			  if(!result.cancelled){
				$scope.paymentData = {
					destinationAddress : result.text,
					currency : 'STR'
				}
			  }
		  }, 
		  function (error) {
			  alert("Scanning failed: " + error);
		  }
	    );
	};
	
	$scope.donate = function() {
		$scope.paymentData = {
			destinationAddress : 'gEPLboQjouwdRBoVzi8vwLd2SWjZa3xcTL',
			amount : 0.03 * account.balance,
			currency : 'STR'
		}
	};
})

.controller('ReceiveCtrl', function ($scope, Account) {
	$scope.$on('accountInfoLoaded', function (event) {
		account = Account.get();
		$scope.$apply();
	});
	$scope.account = Account.get();
	new QRCode(document.getElementById("QRCODE"), {
		width : 128,
		height : 128,
		text : Account.get().address
	});

})

.controller('AboutCtrl', function ($scope) {

	$scope.GotoLink = function (url) {
		window.open(url, '_system');
	}
});
