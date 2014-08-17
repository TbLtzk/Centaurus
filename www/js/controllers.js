angular.module('starter.controllers', [])

.controller('WalletCtrl', function($scope, Account) {
  $scope.account = Account.get();
})

.controller('SendCtrl', function($scope) {
})

.controller('ReceiveCtrl', function($scope, Account) {
  $scope.account = Account.get();
new QRCode(document.getElementById("QRCODE")
   , {width:128, height: 128, text:Account.get().address});

})

.controller('AboutCtrl', function($scope) {
})
;
