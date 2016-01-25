#!/usr/bin/env node

//
// This hook copies all required lib files from our version control system directories into www/lib dir
//

var fs = require('fs-extra');

const sourceDir = 'bower_components/';
const targetDir = 'www/lib/'

var libs = [
    'ionic/release/css/ionic.min.css'
  , 'ionic/release/fonts'
  , 'ionic/release/js/ionic.bundle.min.js'
  , 'ng-cordova/dist/ng-cordova.min.js'
  , 'angular-translate/angular-translate.min.js'
  , 'angular-translate-loader-static-files/angular-translate-loader-static-files.min.js'
  , 'stellar-sdk/stellar-sdk.min.js'
  , 'cryptojslib/rollups/aes.js'
  , 'tweetnacl/nacl-fast.min.js'
  , 'moment/min/moment-with-locales.min.js'
];
libs.forEach(function(file){
    fs.copy(sourceDir + file, targetDir + file, function(err){
        if(err)
            console.error('010_copy_libs failed to copy ' + file);
        else
            console.log('010_copy_libs copied ' + file);
    });
});
