// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'ng-cordova', 'pascalprecht.translate',
   , 'starter.services', 'starter.controllers', 'starter.controllers.send', 'starter.directives', 'starter.filters'])

.run(function ($ionicPlatform, $translate) {
	$ionicPlatform.ready(function () {
		// Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
		// for form inputs)
	    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
			cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
		}
		if (window.StatusBar) {
			// org.apache.cordova.statusbar required
			StatusBar.styleDefault();
		}
    });
})

.config(function ($ionicConfigProvider) {
    $ionicConfigProvider.tabs.position('bottom');
    $ionicConfigProvider.navBar.alignTitle('center');
})

.config(function ($stateProvider, $urlRouterProvider, $translateProvider) {

	// Ionic uses AngularUI Router which uses the concept of states
	// Learn more here: https://github.com/angular-ui/ui-router
	// Set up the various states which the app can be in.
	// Each state's controller can be found in controllers.js
	$stateProvider

	// setup an abstract state for the tabs directive
	.state('app', {
	    url: "/app",
		abstract : true,
		templateUrl: "templates/sidemenus.html"
	})

	// Each tab has its own nav history stack:

	.state('app.receive', {
		url : '/receive/',
		views : {
		    'sidemenuContent': {
				templateUrl : 'templates/tab-receive.html',
				controller : 'ReceiveCtrl'
			}
		}
	})

	.state('app.wallet', {
		url : '/wallet/',
		views : {
		    'sidemenuContent': {
				templateUrl : 'templates/tab-wallet.html',
				controller : 'WalletCtrl'
			}
		}
	})

	.state('app.send', {
	    url: '/send/{recipient}',
	    views: {
	        'sidemenuContent': {
	            templateUrl: 'templates/tab-send.html',
	            controller: 'SendCtrl'
	        }
	    }
	})

	.state('app.transactions', {
	    url: '/transactions/',
	    views: {
	        'sidemenuContent': {
	            templateUrl: 'templates/tab-transactions.html',
	            controller: 'TransactionsCtrl'
	        }
	    }
	})

	.state('app.contacts', {
	    url: '/contacts/',
	    views: {
	        'sidemenuContent': {
	            templateUrl: 'templates/view-contacts.html',
	            controller: 'ContactsCtrl'
	        }
	    }
	})

	.state('app.about', {
		url : '/about/',
		views : {
		    'sidemenuContent': {
				templateUrl : 'templates/tab-about.html',
				controller : 'AboutCtrl'
			}
		}
	})

    .state('app.language', {
        url: '/language/',
        views: {
            'sidemenuContent': {
                templateUrl: 'templates/selectLanguage.html',
                controller: 'AboutCtrl'
            }
        }
    });

	// if none of the above states are matched, use this as the fallback
	$urlRouterProvider.otherwise('/app/wallet/');

    ///////////////////////////////////////////////////
    /// translate
	$translateProvider.useStaticFilesLoader({
	    prefix: 'i18n/',
	    suffix: '.json'
	});
	$translateProvider
    .registerAvailableLanguageKeys(['en', 'de', 'fr', 'nl'], {
        'de_*': 'de',
        'fr_*': 'fr',
        'nl_*': 'nl',
        '*': 'en'
    });

	var lang = window.localStorage['language'];
	if (lang)
	    $translateProvider.preferredLanguage(lang);
	else 
	    $translateProvider.determinePreferredLanguage();

	$translateProvider.fallbackLanguage("en");
});

angular.module("pascalprecht.translate")
.factory("$translateStaticFilesLoader", ["$q", "$http", function (a, b) {
    return function (c) {
        if (!c || !angular.isString(c.prefix) || !angular.isString(c.suffix))
            throw new Error("Couldn't load static files, no prefix or suffix specified!");
        var d = a.defer();
        return b({ url: [c.prefix, c.key, c.suffix].join(""), method: "GET", params: "" })
            .success(function (a) { d.resolve(a) })
            .error(function () { d.reject(c.key) }), d.promise
    }
}]);