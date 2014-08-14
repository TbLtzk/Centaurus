// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

    // setup an abstract state for the tabs directive
    .state('tab', {
      url: "/tab",
      abstract: true,
      templateUrl: "templates/tabs.html"
    })

    // Each tab has its own nav history stack:

    .state('tab.receive', {
      url: '/receive',
      views: {
        'tab-receive': {
          templateUrl: 'templates/tab-receive.html',
          controller: 'ReceiveCtrl'
        }
      }
    })
	
    .state('tab.wallet', {
      url: '/wallet',
      views: {
        'tab-wallet': {
          templateUrl: 'templates/tab-wallet.html',
          controller: 'WalletCtrl'
        }
      }
    })

    .state('tab.send', {
      url: '/send',
      views: {
        'tab-send': {
          templateUrl: 'templates/tab-send.html',
          controller: 'SendCtrl'
        }
      }
    })
	
    .state('tab.about', {
      url: '/about',
      views: {
        'tab-about': {
          templateUrl: 'templates/tab-about.html',
          controller: 'AboutCtrl'
        }
      }
    })
	
    // .state('tab.friend-detail', {
      // url: '/friend/:friendId',
      // views: {
        // 'tab-friends': {
          // templateUrl: 'templates/friend-detail.html',
          // controller: 'FriendDetailCtrl'
        // }
      // }
    // })

	;

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/wallet');

});

