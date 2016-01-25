#!/usr/bin/env node

//
// This hook drops unnecessary files from the platform folder
//

var fs = require('fs-extra');

var victims = [
    'platforms/android/res/drawable'
  , 'platforms/android/res/drawable-hdpi'
  , 'platforms/android/res/drawable-land-hdpi'
  , 'platforms/android/res/drawable-land-ldpi'
  , 'platforms/android/res/drawable-land-mdpi'
  , 'platforms/android/res/drawable-land-xhdpi'
  , 'platforms/android/res/drawable-ldpi'
  , 'platforms/android/res/drawable-mdpi'
  , 'platforms/android/res/drawable-port-hdpi'
  , 'platforms/android/res/drawable-port-ldpi'
  , 'platforms/android/res/drawable-port-mdpi'
  , 'platforms/android/res/drawable-port-xhdpi'
  , 'platforms/android/res/drawable-xhdpi'
];

victims.forEach(function(file){
    fs.remove(file, function(err){
        if(err)
            console.error('005_drop_files: failed to remove ' + file);
        else
            console.log('005_drop_files: removed ' + file);
    });
});
