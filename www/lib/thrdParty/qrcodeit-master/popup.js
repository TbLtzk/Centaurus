// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.




document.addEventListener('DOMContentLoaded', function () {
 chrome.tabs.getSelected(null,function(tab) {
    var tablink = tab.url;
    var tabname= tab.title;
    $("#title").text(tabname);
    new QRCode(document.getElementById("qrcode"), tablink);
});
});
