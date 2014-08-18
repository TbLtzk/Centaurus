angular.module('starter.controllers', [])
.controller('WalletCtrl', function($scope, Account) {  
  $scope.$on('accountInfoLoaded', function(event){  
	$scope.account = Account.get();		
	$scope.$apply();
  });
  $scope.account = Account.get();	
})

.controller('SendCtrl', function($scope, Account) {
  $scope.available = Account.get().balance - Account.get().reserve;
})

.controller('ReceiveCtrl', function($scope, Account) {
  $scope.account = Account.get();
new QRCode(document.getElementById("QRCODE")
   , {width:128, height: 128, text:Account.get().address});

})

.controller('AboutCtrl', function($scope) {

  $scope.GotoLink = function (url) {
    window.open(url,'_system');
  }
})
;
