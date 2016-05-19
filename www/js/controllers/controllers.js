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

	$scope.revealSecret = function () {
	    UIHelper.translate(['tabs.wallet.secret']).then(function(t){
	        window.prompt(t[0], Settings.getKeys().secret);
        })
	}
})

.controller('ReceiveCtrl', function ($scope, Account, UIHelper) {
	$scope.$on('accountInfoLoaded', function (event) {
		$scope.account = Account.get();
		$scope.$apply();
	});
	$scope.account = Account.get();
	new QRCode(document.getElementById("QRCODE"), {
		width : 200,
		height : 200,
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

.controller('TransactionsCtrl', function ($scope, $ionicPopup, Account, Contacts, UIHelper) {
    var augmentTransactions = function (trxList) {
        for (var i = 0; i < trxList.length; i++) {
            var trx = trxList[i];
            if(!trx.remoteAccount)
                trx.remoteAccount = trx.debit ? trx.receiver : trx.sender;
            var c = Contacts.findReverse(trx.remoteAccount, trx.memo);
            trx.remoteContact = c ? c.name : null;
        }
    }

    var bindTransactions = function () {
        var account = Account.get();
        augmentTransactions(account.transactions);
        $scope.account = account;
    }

    var onNewTransactions = function (event) {
        bindTransactions();
        $scope.$apply();
    };
    $scope.$on('accountInfoLoaded', onNewTransactions);
    $scope.$on('newTransaction', onNewTransactions);

    bindTransactions();

    $scope.createContact = function (trx) {
        $scope.contact = {
            address: trx.remoteAccount,
            memo: trx.debit ? trx.memo : null,
            memoType: trx.debit ? trx.memoType: null
        };
        UIHelper.translate(
            ['controllers.trx.createContact.popup.title'
            , 'controllers.trx.createContact.popup.subtitle'
            , 'general.btn.cancel'
            , 'general.btn.ok'
            , 'controllers.trx.createContact.popup.exists'
            ]).then(function (t) {
                $scope.myPopup = $ionicPopup.show({
                    templateUrl: 'templates/view-contact.html',
                    title: t[0],
                    subTitle: t[1],
                    scope: $scope,
                    buttons: [
                      { text: t[2] },
                      {
                          text: '<b>' + t[3] + '</b>',
                          type: 'button-positive',
                          onTap: function (e) {
                              if (Contacts.add($scope.contact.name, $scope.contact.address, $scope.contact.memo))
                                  augmentTransactions($scope.account.transactions);
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
})

.controller('ContactsCtrl', function ($scope, $location, $ionicPopup, Contacts, UIHelper) {
    $scope.contactList = Contacts.getAll();
    $scope.sendPayment = function (contactName) {
        $location.url('tab/send/' + contactName);
    };
    $scope.remove = function (contactName) {
        UIHelper.confirmAndRun('controllers.contacts.remove.caption',
        'controllers.contacts.remove.text',
        function () {
            Contacts.removeByName(contactName);
        });
    };
    $scope.createContact = function () {
        $scope.contact = {};
        UIHelper.translate(
            ['controllers.trx.createContact.popup.title'
            , 'controllers.trx.createContact.popup.subtitle'
            , 'general.btn.cancel'
            , 'general.btn.ok'
            , 'controllers.trx.createContact.popup.exists'
            ]).then(function (t) {
                $scope.myPopup = $ionicPopup.show({
                    templateUrl: 'templates/view-contact.html',
                    title: t[0],
                    subTitle: t[1],
                    scope: $scope,
                    buttons: [
                      { text: t[2] },
                      {
                          text: '<b>' + t[3] + '</b>',
                          type: 'button-positive',
                          onTap: function (e) {
                              if (Contacts.add($scope.contact.name, $scope.contact.address, $scope.contact.memo))
                                  return true;
                              else {
                                  UIHelper.showAlert(t[4]);
                                  e.preventDefault();
                              }
                          }
                      },
                    ]
                });
            });
    }
    $scope.edit = function (contact) {
        $scope.contact = {
            name: contact.name,
            address: contact.address,
            memo: contact.memo,
            memoType: contact.memoType
        };
        UIHelper.translate(
            [ 'controllers.contacts.edit.popup.title'
            , 'controllers.contacts.edit.popup.subtitle'
            , 'general.btn.cancel'
            , 'general.btn.ok'
            ]).then(function (t) {
                $scope.myPopup = $ionicPopup.show({
                    templateUrl: 'templates/view-contact.html',
                    title: t[0],
                    subTitle: t[1],
                    scope: $scope,
                    buttons: [
                      { text: t[2] },
                      {
                          text: '<b>' + t[3] + '</b>',
                          type: 'button-positive',
                          onTap: function (e) {
                              contact.name = $scope.contact.name;
                              contact.address = $scope.contact.address;
                              contact.memo = $scope.contact.memo;
                              contact.memoType = $scope.contact.memoType;
                              Contacts.save();
                              return true;
                          }
                      },
                    ]
                });
            });
    }
})

.controller('AboutCtrl', function ($scope, $ionicPopover, UIHelper) {
    $scope.languages = {
        available: ['de', 'en', 'fr', 'nl', 'zh'],
        selected: UIHelper.getCurrentLanguage()
    }
    $scope.$watch('languages.selected', function (newLang) {
        window.localStorage['language'] = newLang;
        UIHelper.changeLanguage(newLang);
    });
    $ionicPopover.fromTemplateUrl('templates/selectLanguage.html', {
        scope: $scope
    }).then(function (popover) {
        $scope.languagePopover = popover;
    });
})

.controller('NavCtrl', function ($scope, $ionicSideMenuDelegate) {
    $scope.showMenu = function () {
        $ionicSideMenuDelegate.toggleLeft();
    };
    $scope.showRightMenu = function () {
        $ionicSideMenuDelegate.toggleRight();
    };
});