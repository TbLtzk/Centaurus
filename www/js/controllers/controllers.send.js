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
        technicalAmount : "0"
    };
    $scope.popoverItemCount = 2;
    
    var trustLinesFilter = function(msg){
        return (msg.status === 'success' && msg.type === 'response' && msg.result && msg.result.lines && msg.result.account != account.address);
    };
    var trustLinesCallback = function(msg){
        var lines = msg.result.lines;
        for (index = 0; index < lines.length; ++index) {
            var currentLine = lines[index];
            if(currentLine.limit <= 0)
                continue;
            var isNewCurrency = $scope.destinationInfo.acceptedCurrencies.indexOf(currentLine.currency) == -1;
            if(isNewCurrency)
                $scope.destinationInfo.acceptedCurrencies.push(currentLine.currency);
            var iou = { 
                currency: currentLine.currency,
                issuer: currentLine.account
            };
            $scope.destinationInfo.acceptedIOUs.push(iou); 
        }
        $scope.transactionContext.isDirty = true;
        $scope.popoverItemCount = Math.min($scope.destinationInfo.acceptedCurrencies.length, 5);
        $scope.$apply();
    };
    Remote.addMessageHandler(trustLinesFilter, trustLinesCallback);
    
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
        var context = $scope.transactionContext;
        if(context.currentAlternativeStream)
        {
            context.currentAlternativeStream.subcommand = "close";
            //Remote.send(context.currentAlternativeStream);  
            context.currentAlternativeStream = null;
        }
        context.technicalAmount = null;
        context.alternatives = [];
        var isCompletePaymentInfo = $scope.destinationInfo.isValidAddress
            && context.isValidCurrency            
            && $scope.paymentData.amount > 0
            && ($scope.paymentData.currency == 'XLM' || $scope.destinationInfo.acceptedIOUs.length > 0);        
        
        if(isCompletePaymentInfo)
        {
            if($scope.paymentData.currency == 'XLM') {
                context.technicalAmount = ($scope.paymentData.amount).toString();
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
                context.technicalAmount = { 
                    currency : $scope.paymentData.currency, 
                    value : $scope.paymentData.amount.toString(),
                    issuer : issuer
                };
            }           
            
            var keys = Settings.getKeys();
            context.currentAlternativeStream = {
                "command": "find_path",
                "subcommand": "create",
                "source_account": keys.address,
                "destination_account": $scope.paymentData.destinationAddress,
                "destination_amount": context.technicalAmount
            };
            //            Remote.send(context.currentAlternativeStream);
        }
        
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
    
    $scope.$on('paymentSuccessful', function (event) {
        $scope.paymentData.amount = 0;
    });

    $scope.$watch('paymentData.currency', function(newCurrency) {
        if(newCurrency.toUpperCase() != $scope.paymentData.currency)
            $scope.paymentData.currency = newCurrency.toUpperCase();
        else {
            $scope.transactionContext.isValidCurrency = newCurrency.length == 3; // TODO: more suffisticated validation
            $scope.transactionContext.isDirty = true;
        }
    });

    $scope.$watch('paymentData.amount', function(newAmount) {
        $scope.transactionContext.isDirty = true;
    });

    $scope.sendPayment = function () {
        var context = $scope.transactionContext;
        var keys = Settings.getKeys();
        var data = {
            command : 'submit',
            tx_json : {
                TransactionType : 'Payment',
                Account : keys.address,
                Destination : $scope.paymentData.destinationAddress,
                Amount : context.technicalAmount,
            },
            secret : keys.secret
        };
        if($scope.paymentData.destinationTag)
            data.tx_json.DestinationTag = $scope.paymentData.destinationTag; 


        var operation;
        if ($scope.destinationInfo.needFunding) {
            operation = StellarSdk.Operation.createAccount({
                destination: $scope.paymentData.destinationAddress,
                startingBalance: context.technicalAmount
            });
        }
        else {
            operation = StellarSdk.Operation.payment({
                destination: $scope.paymentData.destinationAddress,
                asset: StellarSdk.Asset.native(),
                amount: context.technicalAmount
            });
        }

        var actualSendAction = function () {
            UIHelper.blockScreen("To the moon...", 12);
            var memo;
            if ($scope.paymentData.destinationTag)
                memo = StellarSdk.Memo.text($scope.paymentData.destinationTag);
            var transaction = Account.buildTransaction(operation, memo, true);
            Remote.getServer().submitTransaction(transaction)
            .then(function (transactionResult) {
                console.log(transactionResult);
                UIHelper.blockScreen('Payment successful!', 2);
            })
            .catch(function (err) {
                if (err.type === 'https://stellar.org/horizon-errors/transaction_failed') {
                    Account.reload();
                    UIHelper.showAlert('Out of sync with the network. Please try again');
                }
                else {
                    var msg = err.title;
                    if (err.extras && err.extras.result_codes)
                        msg += ': ' + err.extras.result_codes.transaction;
                    UIHelper.showAlert(msg);
                }
            });
        }

        if($scope.paymentData.destinationAddress.length == 0)
            UIHelper.showAlert('Destination address must not be empty.');
        else if(!$scope.destinationInfo.isValidAddress)
            UIHelper.showAlert('"' + $scope.paymentData.destinationAddress + '" is not a valid destination address.');
        else if($scope.paymentData.amount < 0)
            UIHelper.showAlert('Negative amount is not allowed.');
        else if($scope.paymentData.amount == 0 || $scope.paymentData.amount == null)
            UIHelper.showAlert('Amount must be greater than 0.');
        else if(!context.isValidCurrency)
            UIHelper.showAlert('"' + $scope.paymentData.currency + '" is not a valid currency.');
        else if($scope.paymentData.currency == 'XLM' && $scope.paymentData.amount > account.balance)
            UIHelper.showAlert('Insufficient Funds');
        else if(context.technicalAmount == null)
            UIHelper.showAlert('Payment not possible. Does the recipient accept the specified currency?');
        else if(context.alternatives.length > 0) {            
            var sheet = {
                buttons: [],
                titleText: 'You can send',
                buttonClicked: function(index) {
                    var choice = context.alternatives[index];
                    if(choice.paths_computed && choice.paths_computed.length > 0)
                    {
                        data.tx_json.Paths = choice.paths_computed;
                        data.tx_json.SendMax = choice.source_amount;
                    }
                    actualSendAction();
                    return true;
                }
            };
            for (i=0; i<context.alternatives.length; i++)
            {
                var alternative = context.alternatives[i];
                var source_amount = alternative.source_amount;
                var amount = source_amount.value;
                var currency = source_amount.currency;
                var issuer = source_amount.issuer;
                if(currency == null)
                {
                    currency = 'XLM';
                    amount = (source_amount.valueOf() / 1000000).toString();
                }
                var button = { text : amount + ' ' + currency };
                sheet.buttons.push(button);
            }
            $ionicActionSheet.show(sheet); 
        }
        else 
            actualSendAction();        
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
			    UIHelper.showAlert("Scanning failed: " + error);
			}
		);
    };

    $scope.donate = function () {
        $scope.paymentData = {
            destinationAddress : 'GC7DJUFVMD5BYXS67MWAAQSJF6UASF47RY2AUCKOR5J2YTWS6ZNIGS6Y',
            amount : Math.floor(0.01 * account.balance),
            currency : 'XLM'
        }
    };
})

