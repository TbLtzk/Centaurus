angular.module('starter.controllers.send', [])
.controller('SendCtrl', function ($scope, $ionicActionSheet, $ionicPopover, UIHelper, Account, Remote, Settings, QR, Commands) {
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
        destinationAddress : '',
        destinationTag : null,
        amount : null,
        currency : 'XLM'
    };
    $scope.destinationInfo = {
        isValidAddress: false,
        needFunding : false,
        acceptedCurrencies : ['XLM'],
        acceptedIOUs : []
    };
    $scope.transactionContext = {
        isDirty : false,
        isValidCurrency : false,
        alternatives : [],
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
            Remote.getServer.paths(keys.address, $scope.paymentData.destinationAddress, asset, context.amount)
                .call()
                .then(function (response) {
                    context.alternatives = response.records;
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
    
    $scope.$watch('paymentData.destinationAddress', function(newAddress) {
        $scope.destinationInfo.acceptedCurrencies = ['XLM'];
        $scope.destinationInfo.acceptedIOUs = [];
        var isValidAddress = newAddress.length == 56; // TODO: more suffisticated validation
        if(isValidAddress)
        {
            Remote.getServer().accounts()
            .address(newAddress)
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
                        issuer: bal.issuer
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
        //        if($scope.destinationInfo.acceptedCurrencies.indexOf($scope.paymentData.currency) < 0)
        //        {
        //            $scope.paymentData.currency = 'STR';
        //            $scope.paymentData.amount = 0;
        //        }
        $scope.transactionContext.isDirty = true;
    });
    
    //$scope.$on('paymentSuccessful', function (event) {
    //    $scope.paymentData.amount = 0;
    //});

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

    $scope.sendPayment = function () {
        var context = $scope.transactionContext;
        var keys = Settings.getKeys();
        if($scope.paymentData.destinationTag)
            data.tx_json.DestinationTag = $scope.paymentData.destinationTag; 

        var operationBuilder = function () {
            if ($scope.destinationInfo.needFunding) {
                operation = StellarSdk.Operation.createAccount({
                    destination: $scope.paymentData.destinationAddress,
                    startingBalance: context.amount.toString()
                });
            }
            else {
                operation = StellarSdk.Operation.payment({
                    destination: $scope.paymentData.destinationAddress,
                    asset: StellarSdk.Asset.native(),
                    amount: context.amount.toString()
                });
            }
        }

        var actualSendAction = function () {
            UIHelper.blockScreen('controllers.send.pending', 20);
            var memo;
            if ($scope.paymentData.destinationTag)
                memo = StellarSdk.Memo.text($scope.paymentData.destinationTag);
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
        }

        UIHelper.translate(
            [ 'controllers.send.validate.address.invalid'
            , 'controllers.send.validate.currency.invalid'
            , 'controllers.send.options.title'
            ]).then(function (t) {
            if($scope.paymentData.destinationAddress.length == 0)
                UIHelper.showAlert('controllers.send.validate.address.empty');
            else if(!$scope.destinationInfo.isValidAddress)
                UIHelper.showAlert('"' + $scope.paymentData.destinationAddress + '" ' + t[0]);
            else if($scope.paymentData.amount < 0)
                UIHelper.showAlert('controllers.send.validate.amount.negative');
            else if($scope.paymentData.amount == 0 || $scope.paymentData.amount == null)
                UIHelper.showAlert('controllers.send.validate.amount.zero');
            else if(!context.isValidCurrency)
                UIHelper.showAlert('"' + $scope.paymentData.currency + '" ' + t[1]);
            else if($scope.paymentData.currency == 'XLM' && $scope.paymentData.amount > account.balance)
                UIHelper.showAlert('controllers.send.validate.amount.funds');
            else if ($scope.paymentData.currency != 'XLM')
                UIHelper.showAlert('Assets other than XLM are not supported yet, but coming soon.');
            else if ($scope.paymentData.currency != 'XLM' && context.alternatives.length == 0)
                UIHelper.showAlert('controllers.send.validate.path');
            else if (context.amount == null)
                UIHelper.showAlert('controllers.send.validate.general');
            else if (context.alternatives.length > 0) {
                var sheet = {
                    buttons: [],
                    titleText: t[2],
                    buttonClicked: function (index) {
                        var choice = context.alternatives[index];
                        // TODO: build path operation
                        UIHelper.showAlert(choice);
                        //if(choice.paths_computed && choice.paths_computed.length > 0)
                        //{
                        //}
                        //actualSendAction();
                        return true;
                    }
                };
                for (i = 0; i < context.alternatives.length; i++) {
                    var alternative = context.alternatives[i];
                    var amount = alternative.source_amount;
                    var currency = alternative.source_asset_code;
                    //var issuer = source_amount.issuer;
                    //if(currency == null)
                    //{
                    //    currency = 'XLM';
                    //    amount = (source_amount.valueOf() / 1000000).toString();
                    //}
                    var button = { text: amount + ' ' + currency };
                    sheet.buttons.push(button);
                }
                $ionicActionSheet.show(sheet);
            }
            else 
                actualSendAction();   
        });
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
            destinationAddress: 'GAN65D2FEI63T4MBMOWWOP3K7VS6SVI5T6NNKIHNCI6PN32IGF6OVKSS',
            amount: Math.floor(0.01 * account.balance),
            currency: 'XLM'
        }
    };
})

