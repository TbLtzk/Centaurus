angular.module('starter.controllers', [])
.controller('WalletCtrl', function ($scope, Account) {
	$scope.$on('accountInfoLoaded', function (event) {
		$scope.account = Account.get();
		$scope.$apply();
	});
	$scope.account = Account.get();
})

.controller('SendCtrl', function ($scope, Account, Remote, Settings) {
	var account = Account.get();
	$scope.$on('accountInfoLoaded', function (event) {
		account = Account.get();
		$scope.$apply();
	});

	$scope.paymentData = {
		destinationAddress : 'gEPLboQjouwdRBoVzi8vwLd2SWjZa3xcTL',
		amount : '1',
		currency : 'STR'
	}

	$scope.available = account.balance - account.reserve;
	$scope.account = account;

	$scope.sendPayment = function () {
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
