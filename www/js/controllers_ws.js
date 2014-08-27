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
	$scope.paymentData = {
		destinationAddress : '',
		amount : null,
		currency : 'STR'
	}

	$scope.sendPayment = function () {
		$ionicLoading.show({
			template : "To the moon..."
		});
		$timeout(function () {
			$ionicLoading.hide();
		}, 7000);
		var keys = Settings.getKeys();
		var data = {
			command : 'submit',
			tx_json : {
				TransactionType : 'Payment',
				Account : keys.address,
				Destination : $scope.paymentData.destinationAddress,
				Amount : $scope.paymentData.amount * 1000000,
			},
			secret : keys.secret
		};
		Remote.send(data);
	};

	$scope.scanCode = function () {
		QR.scan(
			function (result) {
			if (!result.cancelled) {
				$scope.paymentData = {
					destinationAddress : result.text,
					currency : 'STR'
				}
				$scope.$apply();
			}
		},
			function (error) {
			alert("Scanning failed: " + error);
		});
	};

	$scope.donate = function () {
		$scope.paymentData = {
			destinationAddress : 'gwhiWKCTvS8Mb5kZeGygeiyQKmFTUJfN1D',
			amount : Math.floor(0.02 * account.balance),
			currency : 'STR'
		}
	};
})

.controller('ReceiveCtrl', function ($scope, Account) {
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
		window.location.href = 'mailto:?subject=My%20Stellar%20Address&body=You%20can%20send%20me%20Stellars%20to%20the%20address%20' + $scope.account.address + '.'
	}
})

.controller('AboutCtrl', function ($scope) {

	$scope.GotoLink = function (url) {
		window.open(url, '_system');
	}
});