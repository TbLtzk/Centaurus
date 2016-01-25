#!/usr/bin/env node

//
// This hook copies various resource files from our version control system directories into the appropriate platform specific location
//

var fs = require('fs-extra');

fs.copy('config/android/res', 'platforms/android/res', function(err){
    if(err)
        console.error('040_resource_files failed to copy res directory');
    else
        console.log('040_resource_files copied res directory');
});
