angular.module( "starter.filters", [] )
.filter("fromnow", function () {
    var momentsFilter = function (input) {
        if (input) {
            var curlocale = window.localStorage['language'];
            if (curlocale === null || curlocale === undefined) {
                moment.locale('en');
            } else {
                moment.locale(curlocale);
            }
            var mfnow = moment(input).fromNow(true);
            return mfnow;
        }
    };
    return momentsFilter;
})
.filter("trunk", function () {
    var trFilter = function (input, arg1, arg2) {
        if (input) {
            var limit = parseInt(arg1);
            var word = input.toString();
            if (word.length > limit) {
                word = word.substring(0, limit) + ((arg2 === "Y") ? "..." : "");
            }
        }
        return word;
    };
    return trFilter;
});