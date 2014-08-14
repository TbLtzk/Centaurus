angular.module('starter.controllers', [])

.controller('WalletCtrl', function($scope) {
})

.controller('SendCtrl', function($scope) {

new QRCode(document.getElementById("QRCODE")
   , {width:128, height: 128, text:"gEux6NhrybVLuvgaYrgThTk4d3Kmd3s4NP"});

})

.controller('ReceiveCtrl', function($scope) {
})

.controller('AboutCtrl', function($scope) {
})
;
