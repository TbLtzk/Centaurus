angular.module('starter.services', [])

.factory('Account', function($rootScope, Settings, Remote) {
  var keys = Settings.getKeys();
  var account = { address: keys.address, balance: 0, reserve:20, devInfo: keys };
  
  var remote = Remote.get();
  
  var updateAccountInfo = function() {
	  var request = remote.requestAccountInfo(keys.address, function(err, res) {
		if (err){
			console.error('Could not retrieve account info:')
			console.error(err)
		}
		else {
			console.log('accountInfoLoaded');	
			account.balance = res.account_data.Balance/1000000;
			$rootScope.$broadcast('accountInfoLoaded');
		}		
	  })
      request.request();
  };
  
  updateAccountInfo(); // initial account info
  
  remote.on('ledger_closed', function(data){
    updateAccountInfo(); // update account info
  });
  
  return {
    get: function(){
	  return account;
    }
  }
})

.factory('Remote', function() {
var Remote = stellar.Remote; 

var remote = new Remote({
  // see the API Reference for available options
  trusted:        true,
  local_signing:  true,
  local_fee:      true,
  fee_cushion:     1.5,
  servers: [
    {
        host:    'test.stellar.org'
      , port:    9001
      , secure:  true
    }
  ]
});

remote.connect(function() {
  console.log('remote connected')
});

return {
    get: function() {
      return remote;
    }
  }
})

.factory('Settings', function(Remote) {  
  var Request = stellar.Request;
  var remote = Remote.get();

  var keysString = window.localStorage['keys'];

  // override for use in test network (funded)
  var testKeys = { address: 'gHBsnApP6wutZweigvyADvxHmwKZVkAFwY', secret:'s3qgYLVJQJL2eLZ54TB9msjmpRHXQBdQrmG9WbD6yVCx6NrFMYU'}; 
  var testKeysAlternative = { address: 'gEPLboQjouwdRBoVzi8vwLd2SWjZa3xcTL', secret:'sfmB34AMuAPrgbgeFJ7iXxi14NaKxQfcXoEex3p4TqekAgvinha'}; 
  keysString = JSON.stringify(testKeys);
  
  var keys;
  if(!keysString){
  var defaultKeys = { address: 'gEux6NhrybVLuvgaYrgThTk4d3Kmd3s4NP', secret:'mySecret' };
   remote.connect(function() {
	  var request = new Request(remote,'create_keys').callback(function(res,success,error){
		defaultKeys.address = success.account_id;
		defaultKeys.secret=success.master_seed;
		
		keys = defaultKeys;

		window.localStorage['keys'] = JSON.stringify(keys);
		keys.mode = 'created';

		remote.set_secret(keys.address, keys.secret);
		})
  
	request.request();
    
	});
  }
  else {
    keys = JSON.parse(keysString);
	keys.mode = 'loaded';
	remote.set_secret(keys.address, keys.secret);
 }  

  return {
    getKeys: function() {
      return keys;
    }
  }
})
;