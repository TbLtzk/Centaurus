angular.module('starter.services', [])

.factory('Account', function($rootScope, Settings, Remote) {
  
  var keys = Settings.getKeys();
  var remote = Remote.get();
  
  
  var account = { address: keys.address, balance: 0, reserve:50, devInfo: keys };
  
  remote.connect(function() {
  console.log('remote connected')

  var hasFinished = false;
  request = remote.requestAccountInfo(keys.address, function(err, res) {
		if (err){}
		else {
			console.log('You have ' + res.account_data.Balance/1000000 + ' (STR)');	
			account.balance = res.account_data.Balance/1000000;
			$rootScope.$broadcast('accountInfoLoaded');
		}		
	});  
  request.request();  
  });

  return {
    get: function() {
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
        host:    'live.stellar.org'
      , port:    9001
      , secure:  true
    }
  ]
});

return {
    get: function() {
      return remote;
    }
  }
})

.factory('Settings', function() {
  
  var defaultKeys = { address: 'gEux6NhrybVLuvgaYrgThTk4d3Kmd3s4NP', secret:'mySecret' };
  
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

  return {
    getKeys: function() {
      return keys;
    }
  }
})
;