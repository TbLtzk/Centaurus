#!/usr/bin/env node

// this plugin replaces arbitrary text in arbitrary files
//
// Look for the string CONFIGURE HERE for areas that need configuration
//

var fs = require('fs');
var path = require('path');

var rootdir = process.argv[2];

function replace_string_in_file(filename, to_replace, replace_with) {
    var data = fs.readFileSync(filename, 'utf8');

    var result = data.replace(new RegExp(to_replace, "g"), replace_with);
    fs.writeFileSync(filename, result, 'utf8');
}

var target = "test";
if (process.env.TARGET) {
    target = process.env.TARGET;
}

if (rootdir) {
    var ourconfigfile = path.join(rootdir, "config", "project.json");
    var configobj = JSON.parse(fs.readFileSync(ourconfigfile, 'utf8'));

    // CONFIGURE HERE
    // with the names of the files that contain tokens you want replaced.  Replace files that have been copied via the prepare step.
    var filestoreplace = [
        // android
        "platforms/android/assets/www/index.html",
        "platforms/android/assets/www/js/services/services.basic.js",
        "platforms/android/assets/www/js/services/services.js",
        "platforms/android/assets/www/templates/tab-receive.html",
        "platforms/android/assets/www/templates/tab-wallet.html",
        "platforms/android/assets/www/templates/tab-send.html",
        "platforms/android/assets/www/templates/tab-transactions.html",
        "platforms/android/assets/www/templates/tab-about.html",
        // ios
        "platforms/ios/www/index.html",
        "platforms/ios/www/js/services_ws.js",
    ];
    filestoreplace.forEach(function(val, index, array) {
        var fullfilename = path.join(rootdir, val);
        if (fs.existsSync(fullfilename)) {
            // CONFIGURE HERE
            // with the names of the token values. For example, below we are looking for the token ' (T)' (brackets have to be escaped)
            replace_string_in_file(fullfilename, " \\(T\\)", configobj[target].testHint);
            replace_string_in_file(fullfilename, "test.stellar.org", configobj[target].websocket);
            // ... any other configuration
        } else {
            //console.log("missing: "+fullfilename);
        }
    });

}
