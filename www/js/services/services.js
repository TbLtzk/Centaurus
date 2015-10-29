angular.module('starter.services', ['starter.services.basic'])

.factory('Account', function ($rootScope, UIHelper, Settings, Remote) {
	var account;
	var keysChanged = false;
	var connectionChanged = false;
	var paymentsEventSource;

	var resetAccount = function () {
	    account = {
	        address: 'loading',
	        balance: 0,
	        reserve: 20,
	        sequence: 0,
	        transactions: [],
	        otherCurrencies: []
	    };
	};

	resetAccount();

	var addToBalance = function (currency, amount) {
	    if (currency === 'native' || currency === 'XLM' || currency == null) {
	        account.balance += amount;
	        return;
	    }
        for(var index = 0; index < account.otherCurrencies.length; ++index) {
            var entry = account.otherCurrencies[index];
            if(entry.currency == currency)
            {
                entry.amount += amount;
                return;
            }
        }
        // no entry for currency exists -> add new entry
        account.otherCurrencies.push({currency:currency, amount:amount});             
    };
	
	var attachToKeys = function () {
	    var keys = Settings.getKeys();
	    resetAccount();
		account.address = keys.address;

	    // initial balances
	    Remote.getServer().accounts()
        .address(keys.address)
        .call()
        .then(function (acc) {
            console.log(JSON.stringify(acc));
            for (i = 0; i < acc.balances.length; i++){
                var bal = acc.balances[i];
                addToBalance(bal.asset_code, parseFloat(bal.balance));
            }
            account.sequence = acc.sequence;
            $rootScope.$broadcast('accountInfoLoaded');
        })
        .catch(StellarSdk.NotFoundError, function (err) {
            console.log("account not found");
            Remote.getServer().friendbot(keys.address).call();
        })
        .catch(function (err) {
           console.log(err.stack || err);
        })

        var applyToBalance = function (effect) {
            if (effect.type === 'account_created')
                addToBalance(effect.asset_type, parseFloat(effect.starting_balance));
            else if (effect.type === 'account_debited')
                addToBalance(effect.asset_type, -parseFloat(effect.amount));
            else if (effect.type === 'account_credited')
                addToBalance(effect.asset_type, parseFloat(effect.amount));                        
        };

        var insertTransaction = function (trx, op, effect, fromStream) {
            var asset = effect.asset_code;
            if (asset === null || !asset)
                asset = 'XLM'
            else
                asset = effect.asset_code;

            var displayEffect = {
                asset_code: asset,
                amount: effect.amount,
                debit: effect.type === 'account_debited',
                sender: op.from,
                receiver: op.to
            }

            if (effect.type === 'account_created') {
                displayEffect.amount = effect.starting_balance;
                displayEffect.sender = op.funder;
            }

            if (fromStream && account.address === trx.source_account)
                account.sequence = trx.source_account_sequence;

            account.transactions.unshift(displayEffect);
        };

        var insertEffect = function (effect, fromStream) {
            try {
                effect.operation()
                .then(function (op) {
                    op.transaction()
                    .then(function (trx) {
                        insertTransaction(trx, op, effect, fromStream);
                    });
                })
            }
            catch(err) {
                console.log(err);
            }
        };

        var effectHandler = function (effect, fromStream) {
            console.log(effect);
            var isRelevant =
                   effect.type === 'account_created'
                || effect.type === 'account_debited'
                || effect.type === 'account_credited'
            ;

            if(isRelevant) {
                insertEffect(effect, fromStream);
                if (fromStream)
                    applyToBalance(effect);
                $rootScope.$broadcast('accountInfoLoaded');
            }
        };

        Remote.getServer().effects()
            .forAccount(keys.address)
            .limit(30)
            .order('desc')
            .call()
            .then(function (effectResults) {
                var length = effectResults.records ? effectResults.records.length : 0;
                for (index = length-1; index >= 0; index--) {
                    var currentEffect = effectResults.records[index];
                    effectHandler(currentEffect, false);
                }

                var futurePayments = Remote.getServer().effects().forAccount(keys.address);
                if (length > 0) {
                    latestPayment = effectResults.records[0];
                    futurePayments = futurePayments.cursor(latestPayment.paging_token);
                }
                if (paymentsEventSource)
                    paymentsEventSource.close();
                paymentsEventSource = futurePayments.stream({
                    onmessage: function (effect) { effectHandler(effect, true); }
                });

            })
            .catch(function (err) {
                console.log(err)
            });
	};
	
	Settings.get().onKeysAvailable = function () {
		if(Remote.isConnected())
			attachToKeys();
		else
			keysChanged = true;
	};

	var healthCheck = function(){
		var keys = Settings.getKeys();
		if(!keys)
			Settings.get().init();
		if(!Remote.isConnected())
		{
			Remote.init();
			connectionChanged = true;
		}
		if((keysChanged || connectionChanged) && Remote.isConnected())
		{
			attachToKeys();
			keysChanged = false;
			connectionChanged = false;
		}
	}
	
	healthCheck();
	setInterval(healthCheck, 3000);

	return {	
		get : function () {			
			return account;
		},

		buildTransaction: function (operation, memo, bSign) {
		    var acc = new StellarSdk.Account(account.address, account.sequence);
		    var transaction = new StellarSdk.TransactionBuilder(acc, memo)
		        .addOperation(operation)
                .build();
		    if (bSign === true)
		        transaction.sign(Settings.getKeyPair());
		    return transaction;
		},
        
		reload: function () {
		    Settings.get().onKeysAvailable()
		}
	}
})

.factory('Commands', function (UIHelper, Settings, Account) {	

	if (typeof String.prototype.startsWith != 'function') {
		String.prototype.startsWith = function (str){
			return this.slice(0, str.length) == str;
		};
	}
	
	var knownCommands = [];
	knownCommands.add = function(commandName, callback){
		knownCommands.push( { name: commandName, callback: callback } );
	};
	
	var importKeys = function(newKeys){
		var oldKeys = Settings.getKeys();
		
		if(oldKeys.address == newKeys.address && oldKeys.secret == newKeys.secret) {
			UIHelper.showAlert('The keys have been restored correctly but did not change since your last backup.');
		}
		else {
			var doOverwrite = function(){
				Settings.setKeys(newKeys.address, newKeys.secret);
				UIHelper.showAlert('The keys have been restored');
			};

			if(Account.get().balance > 0) {
				UIHelper.confirmAndRun(
					'Overwrite Keys', 
					'This will overwrite your existing keys. If you do not have a backup, the remaining funds on the old address are lost!',
					doOverwrite
				);
			}
			else{
				doOverwrite();
			}
		}
		return true;
	}
	
	var backupCallback = function(content){
		var unmasked = atob(content);
		var newKeys = JSON.parse(unmasked);
		
		return importKeys(newKeys);
	};
	knownCommands.add('backup001', backupCallback);

	var backupCallback2 = function(content){
		UIHelper.promptForPassword(function(pwd){
			try{
				var decrypted = CryptoJS.AES.decrypt(content, pwd).toString(CryptoJS.enc.Utf8);
				var newKeys = JSON.parse(decrypted);			
				return importKeys(newKeys);		
			} catch(ex) {
				console.log(ex.message);
			}
			UIHelper.showAlert('Incorrect password!');
			return false;			
		});
	};
	knownCommands.add('backup002', backupCallback2);

	return {
		parse : function (input) {
			var result = {
				isCommand : false,
				rawCommand: ''
			}
			if(!input)
				return result;
				
			var normalized = input.replace('\\:', ':');
				
			if(normalized.startsWith('centaurus:')){
				result.isCommand =  true;
				result.rawCommand = normalized.substring(10);
			}
			return result;
		},
		
		execute : function (rawCommand) {
			var result = {
				success : false,
				commandName : 'unknownCommand'
			}			
			for (var i=0; i < knownCommands.length; i++) {
				var command = knownCommands[i];
				if(rawCommand.startsWith(command.name)) {
					result.commandName = command.name;
					result.success = command.callback(rawCommand.substring(command.name.length));					
				}
			}
		},
		
		importAddressAndSecret : function (addr, s){
			var newKeys = {
				address : addr,
				secret : s
			};
			return importKeys(newKeys);
		}		
	};
})
