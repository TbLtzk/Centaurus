angular.module('starter.controllers.send', [])
.controller('SendCtrl', function ($scope, $stateParams, $ionicActionSheet, $ionicPopover, UIHelper, Account, Contacts, Remote, Settings, QR, Commands) {
    var account = Account.get();
    $scope.$on('accountInfoLoaded', function (event) {
        account = Account.get();
        $scope.available = account.balance - account.reserve;
        $scope.account = account;
        $scope.$apply();
    });

    $scope.available = account.balance - account.reserve;
    $scope.account = account;
    $scope.showDestinationTag = false;
    $scope.paymentData = {
        destinationAddress : $stateParams ? $stateParams.recipient : '',
        destinationTag : null,
        amount : null,
        currency : 'XLM'
    };
    $scope.destinationInfo = {
        accountId : '',
        memo: null,
        memoType: null,
        isValidAddress: false,
        needFunding : false,
        acceptedCurrencies : ['XLM'],
        acceptedIOUs : []
    };
    $scope.transactionContext = {
        isDirty : false,
        isValidCurrency : false,
        alternatives : [],
        choice : [],
        amount: 0
    };
    $scope.popoverItemCount = 2;
    
    var alternativesFilter = function(msg){
        return (msg.type === 'find_path' && msg.alternatives);
    };
    var alternativesCallback = function(msg){
        $scope.transactionContext.alternatives = msg.alternatives;
        $scope.$apply();
    };
    Remote.addMessageHandler(alternativesFilter, alternativesCallback);

    $ionicPopover.fromTemplateUrl('templates/selectCurrency.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.currencyPopover = popover;
    });

    $scope.$on('$destroy', function() {
        $scope.currencyPopover.remove();
    });
    
    $scope.$watch('transactionContext.isDirty', function(isDirty) {
        if(!isDirty)
            return;
        try{
        var context = $scope.transactionContext;
        if(context.currentAlternativeStream)
        {
            context.currentAlternativeStream.subcommand = "close";
            //Remote.send(context.currentAlternativeStream);  
            context.currentAlternativeStream = null;
        }
        context.amount = $scope.paymentData.amount;
        context.alternatives = [];
        var isCompletePaymentInfo = $scope.destinationInfo.isValidAddress
            && context.isValidCurrency            
            && context.amount > 0
            && ($scope.paymentData.currency == 'XLM' || $scope.destinationInfo.acceptedIOUs.length > 0);        
        
        if(isCompletePaymentInfo)
        {
            var asset;            
            if($scope.paymentData.currency == 'XLM') {
                asset = StellarSdk.Asset.native();
            }
            else {
                var issuer = '';
                for(i=0; i<$scope.destinationInfo.acceptedIOUs.length; i++)
                {
                    var iou = $scope.destinationInfo.acceptedIOUs[i];
                    if(iou.currency === $scope.paymentData.currency){
                        issuer = iou.issuer;
                        break;
                    }                    
                }
                asset = new StellarSdk.Asset($scope.paymentData.currency, issuer);
            }           
            
            var keys = Settings.getKeys();
            Remote.getServer().paths(keys.address, $scope.destinationInfo.accountId, asset, context.amount)
                .call()
                .then(function (response) {
                    context.alternatives = response.records;
                    console.log(JSON.stringify(response));
                })
            .catch(function (err) {
                console.log(err);
            });
        }
        } catch (err) {
            console.log(err);
        };
        context.isDirty = false;
    });
    
    $scope.$watch('paymentData.destinationAddress', function (newAddress) {
        var fillDestinationInfo = function (id, memo, type) {
            $scope.destinationInfo.accountId = id;
            $scope.destinationInfo.memo = memo;
            $scope.destinationInfo.memoType = type;
        };
        
        var isValidAddress = StellarSdk.Account.isValidAccountId(newAddress);
        if (isValidAddress)
            fillDestinationInfo(newAddress);
        else {
            var contact = Contacts.find(newAddress);
            if (contact)
                fillDestinationInfo(contact.address, contact.memo, contact.memoType);
            else {
                StellarSdk.FederationServer.resolve(newAddress)
                 .then(function(federationRecord) {
                     fillDestinationInfo(federationRecord.account_id, federationRecord.memo, federationRecord.memo_type);
                     Contacts.add(newAddress, federationRecord.account_id, federationRecord.memo, federationRecord.memo_type);
                 })
                .catch(function(err) {
                    fillDestinationInfo('');
                });
            }
        }
    });
    
    $scope.$watch('destinationInfo.accountId', function(newAccountId) {
        $scope.destinationInfo.acceptedCurrencies = ['XLM'];
        $scope.destinationInfo.acceptedIOUs = [];
        var isValidAddress = StellarSdk.Account.isValidAccountId(newAccountId);
        if(isValidAddress)
        {
            Remote.getServer().accounts()
            .address(newAccountId)
            .call()
            .then(function (acc) {
                $scope.destinationInfo.needFunding = false;
                for (i = 0; i < acc.balances.length; i++) {
                    var bal = acc.balances[i];
                    if (!bal.asset_code)
                        continue;
                    if (bal.limit <= 0)
                        continue;
                    var isNewCurrency = $scope.destinationInfo.acceptedCurrencies.indexOf(bal.asset_code) == -1;
                    if (isNewCurrency)
                        $scope.destinationInfo.acceptedCurrencies.push(bal.asset_code);
                    var iou = {
                        currency: bal.asset_code,
                        issuer: bal.asset_issuer
                    };
                    $scope.destinationInfo.acceptedIOUs.push(iou);
                }
                $scope.transactionContext.isDirty = true;
                $scope.popoverItemCount = Math.min($scope.destinationInfo.acceptedCurrencies.length, 5);
                $scope.$apply();
            })
            .catch(StellarSdk.NotFoundError, function (err) {
                $scope.destinationInfo.needFunding = true;
            });
        }
        $scope.destinationInfo.isValidAddress = isValidAddress;
        $scope.transactionContext.isDirty = true;
    });
    
    $scope.$watch('paymentData.currency', function(newCurrency) {
        if(newCurrency.toUpperCase() != $scope.paymentData.currency)
            $scope.paymentData.currency = newCurrency.toUpperCase();
        else {
            $scope.transactionContext.isValidCurrency = newCurrency.length > 1; // TODO: more suffisticated validation
            $scope.transactionContext.isDirty = true;
        }
    });

    $scope.$watch('paymentData.amount', function(newAmount) {
        $scope.transactionContext.isDirty = true;
    });

    $scope.translationBuffer = {
        translations: [],
        get: function (index) {
            if(index < this.translations.length)
                return this.translations[index];
            return null;
        }
    };
    UIHelper.translate(
        [ 'controllers.send.validate.address.invalid'
        , 'controllers.send.validate.currency.invalid'
        , 'controllers.send.options.title'
        ]).then(function (t) {
            $scope.translationBuffer.translations = t;
        });

    $scope.sendPayment = function () {
        var context = $scope.transactionContext;
        var keys = Settings.getKeys();

        var operationBuilder = function () {
            var operation = null;
            if ($scope.destinationInfo.needFunding) {
                operation = StellarSdk.Operation.createAccount({
                    destination: $scope.destinationInfo.accountId,
                    startingBalance: context.amount.toString()
                });
            }
            else {
                var determineSendAsset = function (choice) {
                    if (choice.source_asset_type == "native") {
                        return StellarSdk.Asset.native();
                    }
                    else {
                        return new StellarSdk.Asset(choice.source_asset_code,
                                                    choice.source_asset_issuer);
                    }
                }

                var determineDestAsset = function (choice) {
                    if (choice.destination_asset_type == "native") {
                        return StellarSdk.Asset.native();
                    }
                    else {
                        return new StellarSdk.Asset(choice.destination_asset_code,
                                                    choice.destination_asset_issuer);
                    }
                }

                var determinePath = function (choice) {
                    var path = [];
                    for (var i = 0; i < choice.path.length; i++) {
                        if (choice.path[i].asset_type == "native") {
                            path[i] = StellarSdk.Asset.native();
                        }
                        else {
                            path[i] = new StellarSdk.Asset(choice.path[i].asset_code,
                                                           choice.path[i].asset_issuer);
                        }
                    }
                    return path;
                }

                var choice = context.choice;

                operation = StellarSdk.Operation.pathPayment({
                    sendAsset   : determineSendAsset(choice),
                    sendMax     : choice.source_amount,
                    destination : $scope.destinationInfo.accountId,
                    destAsset   : determineDestAsset(choice),
                    destAmount  : choice.destination_amount,
                    path        : determinePath(choice)
                });
            }
            return operation;
        }

        var actualSendAction = function () {
            try{
            UIHelper.blockScreen('controllers.send.pending', 20);

            if (!$scope.destinationInfo.memo) {
                var explicitMemo = $scope.paymentData.destinationTag;
                if(explicitMemo)
                    $scope.destinationInfo.memo = explicitMemo.substr(0, 28);                
            }

            var memo = null;
            if ($scope.destinationInfo.memo) {
                if ($scope.destinationInfo.memoType === 'id')
                    memo = StellarSdk.Memo.id($scope.destinationInfo.memo.toString());
                else if ($scope.destinationInfo.memoType === 'hash')
                    memo = StellarSdk.Memo.hash($scope.destinationInfo.memo);
                else
                    memo = StellarSdk.Memo.text($scope.destinationInfo.memo);

            }
                
            var operation = operationBuilder();
            var transaction = Account.buildTransaction(operation, memo, true);
            Remote.getServer().submitTransaction(transaction)
            .then(function (transactionResult) {
                console.log(transactionResult);
                $scope.paymentData.amount = 0;
                UIHelper.blockScreen('controllers.send.success', 2);
            })
            .catch(function (err) {
                if (err.type === 'https://stellar.org/horizon-errors/transaction_failed') {
                    var errorCode = err.extras && err.extras.result_codes ? err.extras.result_codes.transaction : null;
                    if (errorCode === "tx_bad_seq") {
                        Account.reload();
                        UIHelper.showAlert('controllers.send.outOfSync');
                    }
                    else
                        UIHelper.showAlert('controllers.send.failed ', ' ' + errorCode);
                }
                else {
                    var msg = err.title;
                    if (err.extras && err.extras.result_codes)
                        msg += ': ' + err.extras.result_codes.transaction;
                    if(msg)
                        UIHelper.showAlert(msg);
                    else
                        UIHelper.showAlert('controllers.send.failed.unknown');
                }
            });
        } catch (err) {
            if (err.message)
                UIHelper.showAlert(err.message);
            else
                UIHelper.showAlert(JSON.stringify(err));
            }
        }

        var t = $scope.translationBuffer;
        if($scope.paymentData.destinationAddress.length == 0)
            UIHelper.showAlert('controllers.send.validate.address.empty');
        else if(!$scope.destinationInfo.isValidAddress)
            UIHelper.showAlert('"' + $scope.paymentData.destinationAddress + '" ' + t.get(0));
        else if($scope.paymentData.amount < 0)
            UIHelper.showAlert('controllers.send.validate.amount.negative');
        else if($scope.paymentData.amount == 0 || $scope.paymentData.amount == null)
            UIHelper.showAlert('controllers.send.validate.amount.zero');
        else if(!context.isValidCurrency)
            UIHelper.showAlert('"' + $scope.paymentData.currency + '" ' + t.get(1));
        else if($scope.paymentData.currency == 'XLM' && $scope.paymentData.amount > account.balance)
            UIHelper.showAlert('controllers.send.validate.amount.funds');
        else if ($scope.paymentData.currency != 'XLM' && context.alternatives.length == 0)
            UIHelper.showAlert('controllers.send.validate.path');
        else if (context.amount == null)
            UIHelper.showAlert('controllers.send.validate.general');
        else {
            var sheet = {
                buttons: [],
                titleText: t.get(2),
                buttonClicked: function (index) {

                    var hasEnoughBalance = function(choice) {
                        var enoughBalance = false;
                        if (choice.source_asset_type == "native") {
                            enoughBalance = account.balance >= choice.source_amount;
                        }
                        else {
                            for (j = 0; j < account.otherCurrencies.length; j++) {
                                if (account.otherCurrencies[j].currency == choice.source_asset_code) {
                                    enoughBalance = account.otherCurrencies[j].amount >= choice.source_amount;
                                    break;
                                }
                            }
                        }
                        return enoughBalance;
                    };

                    var choice = context.alternatives[index];
                    context.choice = context.alternatives[index];

                    if (hasEnoughBalance(choice)) {
                        actualSendAction();
                    }
                    else {
                        UIHelper.showAlert('controllers.send.validate.amount.funds');
                    }
                    return true;
                }
            };
            for (i = 0; i < context.alternatives.length; i++) {
                var alternative = context.alternatives[i];
                var amount = alternative.source_amount;
                var currency = alternative.source_asset_code;
                if (!currency)
                    currency = 'XLM';
                var button = { text: amount + ' ' + currency };
                sheet.buttons.push(button);
            }
            $ionicActionSheet.show(sheet);
        }
    };
	
    $scope.scanCode = function () {
	
        // var text = 'centaurus:backup001eyJhZGRyZXNzIjoiZ0VQTGJvUWpvdXdkUkJvVnppOHZ3TGQyU1dqWmEzeGNUTCIsInNlY3JldCI6InNmbUIzNEFNdUFQcmdiZ2VGSjdpWHhpMTROYUt4UWZjWG9FZXgzcDRUcWVrQWd2aW5oYSIsIm1vZGUiOiJsb2FkZWQifQ==';
        // // var text = 'centaurus:backup001eyJhZGRyZXNzIjoiZzN2Ynl1azJyYnZMTkVkRGVrY3JFaE1xUWl4bVExUThWeiIsInNlY3JldCI6InNmRXBtMzlwdEJjWFc4c21zUnlCRnZKaWVXVGQ0WG05MUc4bkh0cGVrV2Z3UnpvZTFUUCIsIm1vZGUiOiJsb2FkZWQifQ==';
        // var cmd = Commands.parse(text);					
        // if(cmd.isCommand){
        // Commands.execute(cmd.rawCommand);
        // }
        QR.scan(
			function (result) {
			    if (!result.cancelled) {
			        var cmd = Commands.parse(result.text);					
			        if(cmd.isCommand) {
			            Commands.execute(cmd.rawCommand);
			        }
			        else {
			            $scope.paymentData.destinationAddress = result.text;
			        }
			        $scope.$apply();					
			    }
			},
			function (error) {
			    UIHelper.showAlert('controllers.send.scan.failed', ' ' + error);
			}
		);
    };

    $scope.donate = function () {
        $scope.paymentData = {
            //destinationAddress: 'GC7DJUFVMD5BYXS67MWAAQSJF6UASF47RY2AUCKOR5J2YTWS6ZNIGS6Y',
            //destinationAddress: 'GDJXQYEWDPGYK4LGCLFEV6HBIW3M22IK6NN2WQONHP3ELH6HINIKBVY7',
            destinationAddress: 'Centaurus',
            amount: Math.floor(0.01 * account.balance),
            currency: 'XLM'
        }
    };
})

