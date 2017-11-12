//Setting an Angular module:
angular.module('cloudelements', [])

var cloudelementsControllerFunc = function($scope, $http, $interval) {

    $scope.contact = {};
    $scope.contactEvent = {};

    //this function redirects to the Salesforce authentication page to complete the Oauth flow and then creates a credentialed element instance
    $scope.createInstance = function() {

        $http.get('/getSFDCKeys').then(function(returnSFDC) {


                var url = "https://api.cloud-elements.com/elements/api-v2/elements/sfdc/oauth/url?apiKey=" + returnSFDC.data.key + "&apiSecret=" + returnSFDC.data.secret + "&callbackUrl=" + returnSFDC.data.callback + "&state=sfdc";
                $http.get(url)
                    .then(function(returnData) {
                        console.log("createInstanceResult", returnData.data.oauthUrl);

                        angular.element(document.location = returnData.data.oauthUrl)

                    })
            })
            //closes createInstance function
    }

    //this function takes the contact details from the UI and sends them to the createContact route which will post them to Salesforce
    $scope.createContact = function() {
        console.log($scope.contact);

        $http.post('/createContact', $scope.contact).then(function(returnData) {
                console.log("createContactResult", returnData.data);

            })
            //closes createContact function
    }

    $scope.getContact = function() {

        $http.get('/contactEvent').then(function(returnData) {
                console.log("createContactResult", returnData.data);
                $scope.contactEvent = returnData.data;

            })
            //closes createContact function
    }

    $scope.showConfig = function() {
            return false;
        }
        //closes controller
}


angular.module('cloudelements').controller('cloudelementsController', ['$scope', '$http', '$interval', cloudelementsControllerFunc])