angular.module('starter.services', [])

/**
 * A simple example service that returns some data.
 */
.factory('Account', function() {
  
  var account = { name: 'powderfan', address: 'gEux6NhrybVLuvgaYrgThTk4d3Kmd3s4NP', balance: 1000000};

  return {
    get: function() {
      return account;
    }
  }
});
