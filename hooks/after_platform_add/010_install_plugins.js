#!/usr/bin/env node

//this hook installs all your plugins

// add your plugins to this list--either the identifier, the filesystem location or the URL
var pluginlist = [
    "https://github.com/driftyco/ionic-plugins-keyboard.git",
	"https://github.com/EddyVerbruggen/SocialSharing-PhoneGap-Plugin.git",
    "https://github.com/knowledgecode/WebSocket-for-Android.git",
    "com.phonegap.plugins.barcodescanner",
    "org.apache.cordova.console",
    "org.apache.cordova.device",
	"org.apache.cordova.file",
	"org.apache.cordova.inappbrowser"
];

// no need to configure below

var fs = require('fs');
var path = require('path');
var sys = require('sys')
var exec = require('child_process').exec;

function puts(error, stdout, stderr) {
    sys.puts(stdout)
}

pluginlist.forEach(function(plug) {
    exec("cordova plugin add " + plug, puts);
});
