angular.module('starter.controllers.send', [])
.controller('SendCtrl', function ($scope, $stateParams, $ionicActionSheet, $ionicPopover, UIHelper, Account, Contacts, Remote, Settings, QR, Commands) {
    var account = Account.get();
    $scope.$on('accountInfoLoaded', function (event) {
        account = Account.get();
        $scope.available = account.balance - account.reserve;
        $scope.account = account;
        $scope.$apply();
    });

    $scope.pathSequence = 0;
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


    var toAsset = function (type, code, issuer) {
        if (type == "native")
            return StellarSdk.Asset.native();
        else
            return new StellarSdk.Asset(code, issuer)
    };

    var convertPath = function (rawPath) {
        var path = [];
        for (var i = 0; i < rawPath.length; i++) {
            var rawAsset = rawPath[i];
            path[i] = toAsset(rawAsset.asset_type, rawAsset.asset_code, rawAsset.asset_issuer);
        }
        return path;
    }

    var onNewPaths = function (records) {
        var context = $scope.transactionContext;
        var cheapestPerAsset = {};

        for (var i = 0; i < records.length; i++) {
            var record = records[i];

            var alternative = {
                destination_amount: record.destination_amount,
                sendAsset: toAsset(record.source_asset_type, record.source_asset_code, record.source_asset_issuer),
                destAsset: toAsset(record.destination_asset_type, record.destination_asset_code, record.destination_asset_issuer),
                path: convertPath(record.path)
            }

            var assetHops;
            if (alternative.path.length > 0)
                assetHops = alternative.path.length + 1;
            else if (!alternative.sendAsset.equals(alternative.destAsset))
                assetHops = 1;
            else
                assetHops = 0;

            const slipageBufferPerHop = 0.002;
            alternative.bufferedAmount = parseFloat(record.source_amount) * (1 + assetHops * slipageBufferPerHop);

            if (!cheapestPerAsset[alternative.sendAsset.code])
                cheapestPerAsset[alternative.sendAsset.code] = alternative;
            else if(alternative.bufferedAmount < cheapestPerAsset[alternative.sendAsset.code].bufferedAmount)
                cheapestPerAsset[alternative.sendAsset.code] = alternative;
        }

        var alternatives = [];
        for (var code in cheapestPerAsset) {
            if (cheapestPerAsset.hasOwnProperty(code)) {
                alternatives.push(cheapestPerAsset[code]);
            }
        }
        context.alternatives = alternatives;
    }
    
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
            $scope.pathSequence++;
            var pathSequence = $scope.pathSequence;
            Remote.getServer().paths(keys.address, $scope.destinationInfo.accountId, asset, context.amount)
                .call()
                .then(function (response) {
                    if(pathSequence < $scope.pathSequence)
                        return; // a more recent request is pending. Wait for that instead.
                    onNewPaths(response.records);
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
                 .then(function (federationRecord) {
                     var address = federationRecord.account_id.trim();
                     fillDestinationInfo(address, federationRecord.memo, federationRecord.memo_type);
                     Contacts.add(newAddress, address, federationRecord.memo, federationRecord.memo_type);
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
            .accountId(newAccountId)
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
                var choice = context.choice;

                operation = StellarSdk.Operation.pathPayment({
                    sendAsset   : choice.sendAsset,
                    sendMax     : choice.bufferedAmount.toFixed(7),
                    destination : $scope.destinationInfo.accountId,
                    destAsset   : choice.destAsset,
                    destAmount  : choice.destination_amount,
                    path        : choice.path,
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
            var onSuccess = function (transactionResult) {
                $scope.paymentData.amount = 0;
                $scope.destinationInfo.needFunding = false;
                UIHelper.blockScreen('controllers.send.success', 2);
            };
            Account.submitTransaction(transaction).then(onSuccess);
        } catch (err) {
            if (err.message)
                UIHelper.showAlert(err.message);
            else
                UIHelper.showAlert(JSON.stringify(err));
            }
        }

        var chooseAlternative = function (t) {
            var promise = new Promise(function (resolve, reject) {                
                if (context.alternatives.length == 1 && context.alternatives[0].sendAsset.equals(context.alternatives[0].destAsset))
                    resolve(context.alternatives[0]); // single possible payment without currency conversion is selected immediately
                else {
                    var sheet = {
                        buttons: [],
                        titleText: t.get(2),
                        buttonClicked: function (index) {
                            resolve(context.alternatives[index]);
                            return true;
                        },
                        cancel: function () {
                            reject('user aborted choice');
                        }
                    };
                    for (i = 0; i < context.alternatives.length; i++) {
                        var alternative = context.alternatives[i];
                        var currency = alternative.sendAsset.getCode();
                        var precision = alternative.bufferedAmount < 1 ? 7 : 2;
                        var amount = alternative.bufferedAmount.toFixed(precision);
                        var button = { text: amount + ' ' + currency };
                        sheet.buttons.push(button);
                    }
                    $ionicActionSheet.show(sheet);
                }
            });
            return promise;
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
        else if (context.alternatives.length == 0)
            UIHelper.showAlert('controllers.send.validate.path');
        else if (context.amount == null)
            UIHelper.showAlert('controllers.send.validate.general');
        else {
            chooseAlternative(t).then(function (choice) {
                context.choice = choice;
                var hasEnoughBalance = function (choice) {
                    var enoughBalance = false;
                    if (choice.sendAsset.isNative()) {
                        enoughBalance = account.balance >= choice.bufferedAmount;
                    }
                    else {
                        for (j = 0; j < account.otherCurrencies.length; j++) {
                            if (account.otherCurrencies[j].currency == choice.sendAsset.getCode()) {
                                enoughBalance = account.otherCurrencies[j].amount >= choice.bufferedAmount;
                                break;
                            }
                        }
                    }
                    return enoughBalance;
                };

                if (hasEnoughBalance(choice)) {
                    actualSendAction();
                }
                else {
                    UIHelper.showAlert('controllers.send.validate.amount.funds');
                }
            }).catch(function (err) {
                console.log(err)
            });
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

