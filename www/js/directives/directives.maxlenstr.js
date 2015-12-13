angular.module( "starter.directives.maxlenstr", [] )
.directive("maxlenstr", function () {
    return {
        restrict: "A",
        link: function (scope, elem, attrs) {
            var limit = parseInt(attrs.maxlenstr);
            elem.bind('keypress', function (e) {
                if (elem[0].value.length >= limit) {
                    e.preventDefault();
                    return false;
                }
            });
        }
    }
});