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
            //Remote.getServer().friendbot(keys.address).call();
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

            var date = new Date(trx.created_at)
            var displayEffect = {
                effectId : effect.paging_token,
                creationDate: date,
                creationTimestamp : date.getTime(),
                asset_code: asset,
                amount: effect.amount,
                debit: effect.type === 'account_debited',
                sender: op.from,
                receiver: op.to,
                memo: trx.memo,
                memoType: trx.memo_type
            }

            if (op.type === 'create_account') {
                displayEffect.amount = op.starting_balance;
                displayEffect.sender = op.funder;
                displayEffect.receiver = op.account;
            }

            if (fromStream && account.address === trx.source_account)
                account.sequence = trx.source_account_sequence;

            // insert at correct position
            var i;
            for (i = 0; i < account.transactions.length; i++) {
                var compareEffect = account.transactions[i];
                if (displayEffect.effectId === compareEffect.effectId)
                    throw 'transaction already seen: ' + displayEffect.effectId;
                if (displayEffect.creationTimestamp > compareEffect.creationTimestamp) {
                    break;
                }
            }
            account.transactions.splice(i, 0, displayEffect);

            return displayEffect;
        };

        var insertEffect = function (effect, fromStream) {
            var promise = new Promise(function(resolve, reject) {
                try {
                    effect.operation()
                    .then(function (op) {
                        op.transaction()
                        .then(function (trx) {
                            try {
                                var displayEffect = insertTransaction(trx, op, effect, fromStream);
                                resolve(displayEffect);
                            }
                            catch (err) {
                                reject(err);
                            }
                        });
                    })
                }
                catch(err) {
                    reject(err);
                }
            });
            return promise;
        };

        var effectHandler = function (effect, fromStream) {
            console.log(effect);
            var isRelevant =
                   effect.type === 'account_created'
                || effect.type === 'account_debited'
                || effect.type === 'account_credited'
            ;

            if(isRelevant) {
                insertEffect(effect, fromStream)
                .then(function (displayEffect) {
                    if (fromStream) {
                        applyToBalance(effect);
                        $rootScope.$broadcast('accountInfoLoaded');
                    }
                    else {
                        $rootScope.$broadcast('newTransaction');
                    }
                }, function (err) {
                    console.error(err)
                });

            }
        };

        var attachToPaymentsStream = function (opt_startFrom) {
            var futurePayments = Remote.getServer().effects().forAccount(keys.address);
            if (opt_startFrom) {
                futurePayments = futurePayments.cursor(opt_startFrom);
            }
            if (paymentsEventSource) {
                console.log('close open effects stream')
                paymentsEventSource.close();
            }
            console.log('open effects stream with cursor: ' + opt_startFrom)
            paymentsEventSource = futurePayments.stream({
                onmessage: function (effect) { effectHandler(effect, true); }
            });
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
                var startListeningFrom;
                if (length > 0) {
                    latestPayment = effectResults.records[0];
                    startListeningFrom = latestPayment.paging_token;
                }
                attachToPaymentsStream(startListeningFrom);
            })
            .catch(function (err) {
                attachToPaymentsStream('now');
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
		    var builder = new StellarSdk.TransactionBuilder(acc);
		    builder = builder.addOperation(operation);
		    if (memo)
		        builder = builder.addMemo(memo);
		    var transaction = builder.build();
		    if (bSign === true)
		        transaction.sign(Settings.getKeyPair());
		    return transaction;
		},
        
		reload: function () {
		    Settings.get().onKeysAvailable()
		}
	}
})

.factory('Contacts', function () {
    // contact names are considered an id and have to be unique
    var contacts = [
        { name: 'Centaurus', address: 'GDJXQYEWDPGYK4LGCLFEV6HBIW3M22IK6NN2WQONHP3ELH6HINIKBVY7', memo: null, memoType: null }
    ];

    var contactsString = window.localStorage['contacts001'];
    if (contactsString)
        contacts = JSON.parse(contactsString);

    return {
        save: function(){
            var contactsString = JSON.stringify(contacts);
            window.localStorage['contacts001'] = contactsString;       
        },
        getAll: function () {
            return contacts;
        },
        findIndex: function (name) {
            for (var i = 0; i < contacts.length; i++) {
                if (contacts[i].name === name)
                    return i;
            }
            return -1;
        },
        find: function (name) {
            var index = this.findIndex(name);
            if (index < 0)
                return null;
            return contacts[index];
        },
        findReverse: function(address, memo){
            var bestMatch = null;
            for (var i = 0; i < contacts.length; i++) {
                if (contacts[i].address === address) {
                    if (contacts[i].memo === memo)
                        return contacts[i];
                    else if(!bestMatch)
                        bestMatch = contacts[i];
                }
            }
            return bestMatch;
        },
        add: function (name, address, memo, memoType) {
            if (this.find(name) != null)
                return false;
            contacts.push({ name: name, address: address, memo: memo, memoType: memoType });
            this.save();
            return true;
        },
        removeAt: function(index){
            if (index < 0)
                return false;

            contacts.splice(index, 1);
            this.save();
            return true;
        },
        remove: function(c){
            if (!c)
                return false;

            var index = contacts.indexOf(c);
            return this.removeAt(index);
        },
        removeByName: function (name) {
            return this.removeAt(this.findIndex(name));
        }
    }
})

.factory('Commands', function ($http, UIHelper, Settings, Account) {	

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
			UIHelper.showAlert('services.commands.importKeys.noChange');
		}
		else {
			var doOverwrite = function(){
				Settings.setKeys(newKeys.address, newKeys.secret);
				UIHelper.showAlert('The keys have been restored');
			};

			if(Account.get().balance > 0) {
				UIHelper.confirmAndRun(
					'service.commands.importKeys.overwrite.caption', 
					'service.commands.importKeys.overwrite.text',
					doOverwrite
				);
			}
			else{
				doOverwrite();
			}
		}
		return true;
	}

	var redeemStr = function (oldSecret, onSuccess) {
	    try {
	        var newKeys = Settings.getKeys();

	        //var newKeys = {
	        //    address: 'GALYYRH5XCRLVQ3W56PNEZHRV37GY3VFRRFUYU4NNDKOGUAB22OQPUX4',
	        //    secret: 'SDL3VTYAPQCOJDKA34WGXOIJA4RRQ6TAF5NJSVI77KEKP22L2GLIM6GN'
	        //};
	        //oldSecret = 'sfmB34AMuAPrgbgeFJ7iXxi14NaKxQfcXoEex3p4TqekAgvinha';

	        var data = JSON.stringify({
	            newAddress: newKeys.address
	        });
	        var keypair = StellarSdk.Keypair.fromBase58Seed(oldSecret);
	        var publicKey = nacl.util.encodeBase64(keypair.rawPublicKey());
	        var signatureRaw = keypair.sign(data);
	        var signature = nacl.util.encodeBase64(signatureRaw);
	        var message = {
	            data: data,
	            publicKey: publicKey,
	            signature: signature
	        };

	        $http.post('https://api.stellar.org/upgrade/upgrade', message).then(function (resp) {
	            // For JSON responses, resp.data contains the result
	            console.log('Success', resp);
                if(onSuccess)
                    onSuccess(resp);
                return true;
	        }, function (err) {
	            // err.status will contain the status code
	            if (err.data && err.data.message)
	                UIHelper.showAlert(err.data.message);
	            else
	                UIHelper.showAlert(JSON.stringify(err));
	            return false;
	        });
	    } catch (err) {
	        UIHelper.showAlert(err.message);
	        return false;
	    }
	}

	var redeemStrCallback = function (content) {
	    var oldSecret = content;
	    var onSuccess = function (resp) {
	        UIHelper.showAlert('Your STR will be converted to XLM! You might need to close and reopen Centaurus.');
	    };
	    return redeemStr(oldSecret, onSuccess);
	};
	knownCommands.add('redeemSTR001', redeemStrCallback);

	var backupCallback = function(content){
		var unmasked = atob(content);
		var newKeys = JSON.parse(unmasked);
		
		return redeemStrCallback(newKeys.secret);
	};
	knownCommands.add('backup001', backupCallback);

	var backupCallback2 = function(content){
		UIHelper.promptForPassword(function(pwd){
			try{
				var decrypted = CryptoJS.AES.decrypt(content, pwd).toString(CryptoJS.enc.Utf8);
				var newKeys = JSON.parse(decrypted);			
				return redeemStrCallback(newKeys.secret);
            } catch (ex) {
				console.log(ex.message);
			}
			UIHelper.showAlert('services.commands.backup.incorrectPwd');
			return false;			
		});
	};
	knownCommands.add('backup002', backupCallback2);

	var backupCallback3 = function (content) {
	    UIHelper.promptForPassword(function (pwd) {
	        try {
	            var decrypted = CryptoJS.AES.decrypt(content, pwd).toString(CryptoJS.enc.Utf8);
	            var newKeys = JSON.parse(decrypted);
	            return importKeys(newKeys);
	        } catch (ex) {
	            console.log(ex.message);
	        }
	        UIHelper.showAlert('services.commands.backup.incorrectPwd');
	        return false;
	    });
	};
	knownCommands.add('backup003', backupCallback3);

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
		},
        
		upgradeFromStr: redeemStr		
	};
})
