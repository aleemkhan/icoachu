

var CLIENT_ID = '104171984509-bk2s4ivpb9d32ncburf3qq1h2n4u1l7i.apps.googleusercontent.com';
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/classroom/v1/rest"];
var SCOPES = "https://www.googleapis.com/auth/classroom.courses https://www.googleapis.com/auth/classroom.rosters https://www.googleapis.com/auth/classroom.rosters.readonly https://www.googleapis.com/auth/classroom.profile.emails https://www.googleapis.com/auth/classroom.profile.photos https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/classroom.coursework.me";
var gapiReadiness = false;
var app = angular.module("myApp", ["ngRoute"]);

app.config(function($routeProvider) {
    $routeProvider.when("/", {
        templateUrl : "home.html"
    }).when("/courses", {
        templateUrl : "courses.html"
    }).when("/progress", {
        templateUrl : "progress.html"
    }).when("/payments", {
        templateUrl : "payments.html"
    }).when("/add_course", {
        templateUrl : "add_course.html"
    }).when("/help", {
        templateUrl : "help.html"
    }).when("/logout", {
        templateUrl : "logout.html"
    }).when("/course/:id", {
        templateUrl : "course.html"
    });
});



app.controller("myCtrl", function($scope, $http, $route, $routeParams, $location, $window) {
    $scope.isLoggedIn = getItem('login');
    $scope.user = JSON.parse(getItem('user'));
    $scope.session = JSON.parse(getItem('session'));

    var date = new Date();
    var currentUTCTime = date.getTime() + date.getTimezoneOffset()*60;

    if($scope.session == null){
        $scope.isLoggedIn = false;
        setItem($scope.isLoggedIn);
    }else if(($scope.session.expires_at-currentUTCTime)/1000 <= 0){
        $scope.isLoggedIn = false;
        setItem($scope.isLoggedIn);   
    }

    $scope.courses = [];
    
    $scope.$on('$routeChangeSuccess', function() {
        consoleLog('test'); // <-- alert from the question
    });

    if($scope.user == null){
        $scope.user = new Object();
    }

    angular.element(document).ready(function(){
        //handleClientLoad();
        consoleLog('Document Ready Event Fired');
    });

    $scope.login = function (){
        gapi.auth2.getAuthInstance().signIn();
        $scope.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    };

    $scope.logout = function (){
        gapi.auth2.getAuthInstance().signOut();
        $scope.user = new Object();
        removeItem('login');
        removeItem('user');
        removeItem('session');
        $scope.isLoggedIn = false;
    };

    $scope.handleClientLoad = function(){
        gapi.load('client:auth2', function(){
            $scope.initClient();
        });
    };

    $scope.initClient = function(){
        gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
            clientId: CLIENT_ID,
            scope: SCOPES
        }).then(function () {
            gapiReadiness = true;
        });
    };

    $scope.updateSigninStatus = function(isSignedIn){
        consoleLog('google API is working.');
        consoleLog(isSignedIn);
        if (isSignedIn) {                    
            $scope.isLoggedIn = true;
            var myUser = new Object();
            var gUser = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
            myUser.email = gUser.getEmail();
            myUser.id = gUser.getId();
            myUser.picture = gUser.getImageUrl();
            myUser.first_name = gUser.getGivenName();
            myUser.last_name = gUser.getFamilyName();
            myUser.name = gUser.getName();
            $scope.user = myUser;
            $scope.session = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse();
            setItem('user', JSON.stringify(myUser));
            setItem('login', $scope.isLoggedIn);
            setItem('session', JSON.stringify($scope.session));
        } else {
            $scope.isLoggedIn = false;
            $scope.user = new Object();
            setItem('login', false);
            removeItem('user');
        }
    };

    $scope.listCourses = function(){
        $http( {url : 'https://classroom.googleapis.com/v1/courses?access_token='+ $scope.session.access_token , method: 'GET'}
        ).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.courses = response.data.courses;
            }
        }, function(response){
            consoleLog(response);
        });    
    };

    $scope.plotCourse = function(){
        var courseId = $routeParams.id;
        $http( {url : 'https://classroom.googleapis.com/v1/courses/'+courseId+'?access_token='+ $scope.session.access_token , method: 'GET'}
        ).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.course = response.data;
                $scope.getCourseWork($scope.course.id);            
            }
        }, function(response){
            consoleLog(response);
        });    
    };

    $scope.getCourseWork = function(courseId){
        $http( {url : 'https://classroom.googleapis.com/v1/courses/'+courseId+'/courseWork?access_token='+ $scope.session.access_token , method: 'GET'}
        ).then(function(response){
            consoleLog(response);
            $scope.isAssignment = false;
            $scope.isQuestion = false;
            if( response.status == 200 ){
                $scope.courseworks = response.data.courseWork;
                $scope.assignments = new Array();
                $scope.questions = new Array();
                for( var i = 0; i < $scope.courseworks.length; i++ ){
                    if($scope.courseworks[i].workType == 'MULTIPLE_CHOICE_QUESTION'){
                        $scope.questions.push($scope.courseworks[i]);
                        $scope.isQuestion = true;
                    }else if($scope.courseworks[i].workType == 'ASSIGNMENT'){
                        $scope.assignments.push($scope.courseworks[i]);
                        $scope.isAssignment = true;
                    }else {

                    }
                }
            }
        }, function(response){
            consoleLog(response);
        });    
    };

    $scope.sendMail = function(){
        var mail = 'https://mail.google.com/mail/?view=cm&fs=1&to='+ $scope.course.teacherGroupEmail +'&su=Student: Message Title Here.&body=Type Your Message Here.';
        $window.open(mail);
        console.log("Sending Mail");
    }

    
});

