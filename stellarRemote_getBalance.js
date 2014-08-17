// open the containing folder in command line and type 'node stellarRemote_getBalance.js' <enter>
// if it does not work type 'npm install' <enter> and try again

var Remote = require('stellar-lib').Remote;
var stellarAddress = 'gEux6NhrybVLuvgaYrgThTk4d3Kmd3s4NP'; // funktioniert nicht mit alias

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

remote.connect(function() {
  console.log('remote connected')

  request = remote.requestAccountInfo(stellarAddress)
  request.on('success', function(res){
	console.log('You have ' + res.account_data.Balance/1000000 + ' (STR)')
  });
  request.on('error', function(res){
	console.log('Could not retrieve account info:')
	console.log(res.remote.error_message)
	console.log(res)
  });
  request.request();
});