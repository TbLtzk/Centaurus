angular.module('starter.services', [])

.factory('Account', function($rootScope, Settings, Remote) {
  
  var keys = Settings.getKeys();
  var account = { address: keys.address, balance: 0, reserve:20, devInfo: keys };
  
  var remote = Remote.get();
  
  var updateAccountInfo = function() {
	  var request = remote.requestAccountInfo(keys.address, function(err, res) {
		if (err){
			console.error('Could not retrieve account info:')
			console.error(res.remote.error_message)
			console.error(res)
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

.factory('Remote', function(Settings) {
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

var keys = Settings.getKeys();
remote.set_secret(keys.address, keys.secret);

remote.connect(function() {
  console.log('remote connected')
});

return {
    get: function() {
      return remote;
    }
  }
})

.factory('Settings', function() {
  
  var defaultKeys = { address: 'gEux6NhrybVLuvgaYrgThTk4d3Kmd3s4NP', secret:'mySecret' }; // live network
  
  var keysString = window.localStorage['keys'];
  var keys;
  if(!keysString){
    keys = defaultKeys;
    window.localStorage['keys'] = JSON.stringify(keys);
	keys.mode = 'created';
  }
  else {
    keys = JSON.parse(keysString);
	keys.mode = 'loaded';
  }  

  // override for use in test network
  var keys = { address: 'gHBsnApP6wutZweigvyADvxHmwKZVkAFwY', secret:'s3qgYLVJQJL2eLZ54TB9msjmpRHXQBdQrmG9WbD6yVCx6NrFMYU', mode: 'test'}; 

  return {
    getKeys: function() {
      return keys;
    }
  }
})
;