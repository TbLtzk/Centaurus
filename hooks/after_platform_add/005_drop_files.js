#!/usr/bin/env node

//
// This hook drops unnecessary files from the platform folder
//

var fs = require('fs-extra');

var victims = [
  , 'platforms/android/res/drawable-land-hdpi/screen.png'
  , 'platforms/android/res/drawable-land-ldpi/screen.png'
  , 'platforms/android/res/drawable-land-mdpi/screen.png'
  , 'platforms/android/res/drawable-land-xhdpi/screen.png'
  , 'platforms/android/res/drawable-port-hdpi/screen.png'
  , 'platforms/android/res/drawable-port-ldpi/screen.png'
  , 'platforms/android/res/drawable-port-mdpi/screen.png'
  , 'platforms/android/res/drawable-port-xhdpi/screen.png'
];

victims.forEach(function(file){
    fs.remove(file, function(err){
        if(err)
            console.error('005_drop_files: failed to remove ' + file);
        else
            console.log('005_drop_files: removed ' + file);
    });
});
