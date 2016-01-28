#!/usr/bin/env node

//
// This hook copies all required lib files from our version control system directories into www/lib dir
//

var fs = require('fs-extra');

const sourceDir = 'bower_components/';
const targetDir = 'www/lib/'
const force = false; // set this locally to true when you update bower references

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
var skipped = 0;
libs.forEach(function(file){
    try{
        var targetFile = targetDir + file;
        if(force || !fs.existsSync(targetFile)){
            fs.copySync(sourceDir + file, targetDir + file);
            console.log('010_copy_libs copied ' + file);
        }
        else 
            skipped++;
    } catch(err) {
        console.error('010_copy_libs failed to copy ' + file + ' ' + err);
    }
});
if(skipped > 0)
    console.log('010_copy_libs skipped ' + skipped + ' files');

