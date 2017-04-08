#!/usr/bin/env node

//this hook installs all your plugins

// add your plugins to this list--either the identifier, the filesystem location or the URL
var pluginlist = [
    "ionic-plugin-keyboard",
    "phonegap-plugin-barcodescanner",
    "cordova-plugin-x-socialsharing",
    "cordova-plugin-console",
    "cordova-plugin-device",
    "cordova-plugin-globalization",
    "cordova-plugin-inappbrowser",
    "cordova-plugin-file",
    "cordova-plugin-network-information",
    "cordova-plugin-whitelist"
];

// no need to configure below

var fs = require('fs');
var path = require('path');
var sys = require('sys')
var exec = require('child_process').exec;

function puts(error, stdout, stderr) {
    if(error)
        console.error(error)
    else
        console.log(stdout);
}

pluginlist.forEach(function(plug) {
    exec("cordova plugin add " + plug, puts);
});
