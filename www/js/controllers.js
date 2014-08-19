angular.module('starter.controllers', [])
.controller('WalletCtrl', function ($scope, Account) {
	$scope.$on('accountInfoLoaded', function (event) {
		$scope.account = Account.get();
		$scope.$apply();
	});
	$scope.account = Account.get();
})

.controller('SendCtrl', function ($scope, Account, Remote) {
	var account = Account.get();

	$scope.paymentData = {
		destinationAddress : 'gEPLboQjouwdRBoVzi8vwLd2SWjZa3xcTL',
		amount : '1',
		currency : 'STR'
	}

	$scope.available = account.balance - account.reserve;
	$scope.account = account;

	$scope.sendPayment = function () {
		var Amount = stellar.Amount;

		var remote = Remote.get();
		var transaction = remote.transaction();
		var amountApi = Amount.from_human($scope.paymentData.amount + $scope.paymentData.currency);

		transaction.payment({
			from : account.address,
			to : $scope.paymentData.destinationAddress,
			amount : amountApi
		});

		transaction.submit(function (err, res) {
			// TODO: some visible feedback (and block UI until finished)
			if (err) {
				console.error('Payment ' + JSON.stringify($scope.paymentData) + ' failed:');
				console.error(err);
			} else {
				console.log('Payment ' + JSON.stringify($scope.paymentData) + ' succesful!');
			}
		});
	};
})

.controller('ReceiveCtrl', function ($scope, Account) {
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
