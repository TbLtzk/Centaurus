angular.module('starter.services', [])

.factory('Account', function(Settings) {
  
  var keys = Settings.getKeys();
  
  var account = { address: keys.address, balance: 1000000, reserve:50, devInfo: keys };

  return {
    get: function() {
      return account;
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