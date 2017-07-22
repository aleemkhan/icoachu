

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
    }).when("/course/:courseId/assignment/:assignmentId", {
        templateUrl : "assignment.html"
    }).when("/calendar/:id", {
        templateUrl : "calendar.html"
    }).when("/whiteboard/:id", {
        templateUrl : "whiteboard.html"
    });
});



app.controller("myCtrl", function($scope, $http, $route, $routeParams, $location, $window, $sce) {
    
    $scope.isLoggedIn = getItem('login');
    $scope.user = JSON.parse(getItem('user'));
    $scope.session = JSON.parse(getItem('session'));
    $scope.loaderFlag = false;

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
            $route.reload();
        } else {
            $scope.isLoggedIn = false;
            $scope.user = new Object();
            setItem('login', false);
            removeItem('user');
        }
    };

    $scope.listCourses = function(){
        $scope.showLoader();
        $http( {url : 'https://classroom.googleapis.com/v1/courses?access_token='+ $scope.session.access_token , method: 'GET'}
        ).then(function(response){
            if(response.status==200){
                $scope.coursesAsTeacher = new Array();
                $scope.coursesAsStudent = new Array();
                for(var i=0; i<response.data.courses.length; i++){
                    var course = response.data.courses[i];
                    if(course.courseState != 'ARCHIVED' && course.courseState != 'DECLINED'){
                        if(course.ownerId == $scope.user.id){
                            $scope.coursesAsTeacher.push(course);
                        }else{
                            $scope.coursesAsStudent.push(course);
                        }
                    }
                }
                consoleLog($scope.coursesAsTeacher);
                consoleLog($scope.coursesAsStudent);
                $scope.hideLoader();
            }
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
        });    
    };

    $scope.plotCourse = function(){
        $scope.showLoader();
        $scope.isWhiteboard = false;
        $scope.addMCQs = false;
        $scope.addAssignment = false;
        $scope.addCourseStudent = false;
        var courseId = $routeParams.id;
        $http( {url : 'https://classroom.googleapis.com/v1/courses/'+courseId+'?access_token='+ $scope.session.access_token , method: 'GET'}
        ).then(function(response){
            consoleLog(response);
            $scope.hideLoader();
            if(response.status==200){
                $scope.course = response.data;
                $scope.getCourseWork($scope.course.id);

                if($scope.course.teacherFolder){
                    $scope.googelDriveLink = $scope.course.teacherFolder.alternateLink;
                }else{
                    $scope.googelDriveLink = false;
                }

                if($scope.user.id == $scope.course.ownerId){
                    $scope.iAmTeacher = true;
                    $scope.listCourseStudents($scope.course.id);
                }else{
                    $scope.iAmTeacher = false;
                    $scope.listCourseTeachers($scope.course.id);
                }
                 
                if($scope.course.calendarId){          
                    $scope.courseCalendarId = ($scope.course.calendarId.split('@')[0]).split('classroom')[1]; 
                    consoleLog($scope.courseCalendarId);
                }

                if($scope.course.room){ 
                    if($scope.course.room.indexOf('awwapp.com') !== -1){
                        $scope.isWhiteboard = true;
                        var tempUrl = $scope.course.room;
                        tempUrl = tempUrl.replace("https://awwapp.com/b/", "");
                        tempUrl = tempUrl.replace("/", "");
                        $scope.whiteboardId = tempUrl;
                    }
                }
            }
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
        });    
    };

    $scope.creteCourse = function(name, description, studentName, whiteboard){
        $scope.showLoader();
        consoleLog(name);
        consoleLog(description);
        consoleLog(studentName);
        consoleLog(whiteboard);
        if(name == ''){
            $scope.showToast('Subject Title Cannot be EMPTY');
        }else if(description == ''){
            $scope.showToast('Please Add Subject Short Description');
        }else if(studentName == ''){
            $scope.showToast('Provide the Student Name');
        }else if(whiteboard.indexOf('awwapp.com') == -1){
            $scope.showToast('Whiteboard URL is INVALID');
        }else{
            $http({
                url: 'https://classroom.googleapis.com/v1/courses?access_token='+$scope.session.access_token,
                method: 'POST',   
                data:{
                    "ownerId": $scope.user.id,
                    "name": name,
                    "description": description,
                    "section": studentName,
                    "room": whiteboard
                }
            }).then(function(response){
                consoleLog(response);
                if(response.status==200){
                    $scope.showAlert('Success', name+' has been created successfully', null, null);
                }
                $scope.hideLoader();
            }, function(response){
                consoleLog(response);
                $scope.hideLoader();
            }); 
        }
    }
    
    $scope.listCourseStudents = function(courseId){
        $http({
            url: 'https://classroom.googleapis.com/v1/courses/'+courseId+'/students?access_token='+$scope.session.access_token,
            method: 'GET'
        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.courseStudents = response.data.students;
            }
        }, function(response){
            consoleLog(response);
        }); 
    }

    $scope.listCourseTeachers = function(courseId){
        $http({
            url: 'https://classroom.googleapis.com/v1/courses/'+courseId+'/teachers?access_token='+$scope.session.access_token,
            method: 'GET'
        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.courseTeachers = response.data.teachers;
            }
        }, function(response){
            consoleLog(response);
        }); 
    }

    $scope.setClassStatus = function(id, status){
        $scope.hideLoader();
        $http({
            url: 'https://classroom.googleapis.com/v1/courses/'+id+'?updateMask=courseState&access_token='+$scope.session.access_token,
            method: 'PATCH',   
            data:{
                "courseState": status
            }
        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.hideLoader();
                $scope.showToast('Course has been activated');
            }
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
        }); 
    }

    $scope.inviteUser = function(courseId, role){
        $scope.showLoader();
        var data =  {
            "courseId": courseId,
            "userId": document.getElementById('add_student').value,
            "role": role
        };
        consoleLog(data);
        $http({
            url: 'https://classroom.googleapis.com/v1/invitations?access_token='+$scope.session.access_token,
            method: 'POST',   
            data:data
        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.hideLoader();
                document.getElementById('add_student').value = '';
                $scope.showToast('Invitation has been sent.');
            }
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
            $scope.showToast(response.data.error.message);
        }); 
    }

    $scope.listInvitations = function(){
        $http({
            url: 'https://classroom.googleapis.com/v1/invitations?userId='+$scope.user.email+'&access_token='+$scope.session.access_token,
            method: 'GET'
        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.invitations = response.data.invitations;
            }
        }, function(response){
            consoleLog(response);
        }); 
    }

    $scope.acceptInvitation = function(invitation){
        consoleLog(invitation);
        $http({
            url: 'https://classroom.googleapis.com/v1/invitations/'+invitation.id+':accept?access_token='+$scope.session.access_token,
            method: 'POST'
        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.showToast('Invitation accepted successfully.');
            }
        }, function(response){
            consoleLog(response);
        }); 
    }


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
                $scope.getAllSubmissions(courseId);
            }
        }, function(response){
            consoleLog(response);
        });    
    };


    $scope.getAllSubmissions = function(courseId){
        $http( {url : 'https://classroom.googleapis.com/v1/courses/'+courseId+'/courseWork/-/studentSubmissions?access_token='+ $scope.session.access_token , method: 'GET'}
        ).then(function(response){
            consoleLog('submissions');
            consoleLog(response);
            if(response.status==200){
                if($scope.courseworks &&JSON.stringify(response.data) != '{}'){
                    var doneAssignments = 0;
                    var totalAssignments = 0;
                    for( var i = 0; i < $scope.courseworks.length; i++ ){
                        $scope.courseworks[i].submission =  response.data.studentSubmissions[i];
                        if($scope.courseworks[i].workType == 'MULTIPLE_CHOICE_QUESTION'){
                            $scope.questions.push($scope.courseworks[i]);
                            $scope.isQuestion = true;
                        }else if($scope.courseworks[i].workType == 'ASSIGNMENT'){
                            $scope.assignments.push($scope.courseworks[i]);
                            $scope.isAssignment = true;
                            totalAssignments++;
                            if($scope.courseworks[i].submission.state == 'RETURNED'){
                                doneAssignments++;
                            }
                        }else {

                        }
                    }

                    if($scope.isAssignment){
                        $scope.courseProgress((doneAssignments/totalAssignments)*100);
                    }
                }
                consoleLog($scope.courseworks);
            }
        }, function(response){
            consoleLog(response);
        });
    }

    $scope.plotAssignment = function(){
        var courseId = $routeParams.courseId;
        var assignmentId = $routeParams.assignmentId;
        consoleLog(courseId);
        consoleLog(assignmentId);
        $http( {url : 'https://classroom.googleapis.com/v1/courses/'+courseId+'/courseWork/'+assignmentId+'?access_token='+ $scope.session.access_token , method: 'GET'}
        ).then(function(response){
            consoleLog(response);
            if(response.status==200){
                //$scope.getSubmissions(courseId, assignmentId);
            }
        }, function(response){
            consoleLog(response);
        });  
    };



    $scope.submitAssignment = function(courseId, courseWorkId, submissionId){
        $scope.showLoader();
        $http({

            url : 'https://classroom.googleapis.com/v1/courses/'+courseId+'/courseWork/'+courseWorkId+'/studentSubmissions/'+submissionId+':turnIn?access_token='+$scope.session.access_token, 
            method: 'POST'

        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.showToast("successfully marked as done.");
                $scope.getCourseWork(courseId);
            }
            $scope.hideLoader();
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
        });
    }



    $scope.reclaimAssignment = function(courseId, courseWorkId, submissionId){
        $scope.showLoader();
        $http({

            url : 'https://classroom.googleapis.com/v1/courses/'+courseId+'/courseWork/'+courseWorkId+'/studentSubmissions/'+submissionId+':reclaim?access_token='+$scope.session.access_token, 
            method: 'POST'

        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.showToast("successfully sent request.");
                $scope.getCourseWork(courseId);
            }
            $scope.hideLoader();
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
        });
    }

    $scope.returnAssignment = function(courseId, courseWorkId, submissionId){
        $scope.showLoader();
        $http({

            url : 'https://classroom.googleapis.com/v1/courses/'+courseId+'/courseWork/'+courseWorkId+'/studentSubmissions/'+submissionId+':return?access_token='+$scope.session.access_token, 
            method: 'POST'

        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.showToast("Successfully reopened assignment.");
                $scope.getCourseWork(courseId);
            }
            $scope.hideLoader();
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
        });
    }

    $scope.deleteAssignment = function(courseId, courseWorkId){
        $scope.showLoader();
        $http({

            url : 'https://classroom.googleapis.com/v1/courses/'+courseId+'/courseWork/'+courseWorkId+'?access_token='+$scope.session.access_token, 
            method: 'DELETE'

        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.showToast("Successfully reopened assignment.");
                $scope.getCourseWork(courseId);
            }
            $scope.hideLoader();
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
        });
    }


    $scope.patchMCQ = function(courseId, courseWorkId, submissionId, selection){
        $scope.showLoader();
        var answer = document.querySelector('input[name="options_'+selection+'"]:checked').value;
        consoleLog(answer);
        $http({
            url : 'https://classroom.googleapis.com/v1/courses/'+courseId+'/courseWork/'+courseWorkId+'/studentSubmissions/'+submissionId+'?updateMask=draftGrade,assignedGrade&access_token='+$scope.session.access_token, 
            method: 'PATCH',
            data: {
              "assignedGrade": 0,
              "draftGrade": 0,
              "multipleChoiceSubmission": {
                "answer": answer
              }
            }

        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.showToast("successfully marked as done.");
            }
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
        });
    }

    $scope.submitMCQ = function(courseId, courseWorkId, submissionId){
        $http({

            url : 'https://classroom.googleapis.com/v1/courses/'+courseId+'/courseWork/'+courseWorkId+'/studentSubmissions/'+submissionId+':turnIn?access_token='+$scope.session.access_token, 
            method: 'POST'

        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                $scope.showToast("successfully marked as done.");
                $scope.getCourseWork(courseId);
            }
            $scope.hideLoader();
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
        });
    }

    $scope.courseProgress = function(percent){
        consoleLog(percent);
        document.querySelector('.progressbar').style.width = percent + '%';
        document.querySelector('.bufferbar').style.width =  '0%';
        document.querySelector('.auxbar').style.width =  '100%';
    }

    $scope.createAssignment = function(courseId){
        $scope.showLoader();
        var title = document.getElementById("add_assignment_title").value;
        var description = document.getElementById("add_assignment_description").value;
        //var month = document.getElementById("add_assignment_due").value;
        //consoleLog(month);
        $http({
            url: 'https://classroom.googleapis.com/v1/courses/'+courseId+'/courseWork?access_token='+$scope.session.access_token,
            method: 'POST',   
            data:{
                "title": title,
                "description": description,
                "state": "PUBLISHED",
                "workType": "ASSIGNMENT",
                "submissionModificationMode": "MODIFIABLE_UNTIL_TURNED_IN",
                "associatedWithDeveloper": true
            }
        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                document.getElementById("add_assignment_title").value = '';
                document.getElementById("add_assignment_description").value = '';
                $scope.showToast('Assignment created successfully.');
            }
            $scope.hideLoader();
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
        });
    }


    $scope.createMCQ = function(courseId){
        $scope.showLoader();
        var title = document.getElementById("add_mcq_qestion").value;
        var option_1 = document.getElementById("add_mcq_option_1").value;
        var option_2 = document.getElementById("add_mcq_option_2").value;
        var option_3 = document.getElementById("add_mcq_option_3").value;
        var option_4 = document.getElementById("add_mcq_option_4").value;
        //var month = document.getElementById("add_assignment_due").value;
        //consoleLog(month);
        $http({
            url: 'https://classroom.googleapis.com/v1/courses/'+courseId+'/courseWork?access_token='+$scope.session.access_token,
            method: 'POST',   
            data:{
                "title": title,
                "state": "PUBLISHED",
                "multipleChoiceQuestion": { "choices": [option_1, option_2, option_3, option_4] },
                "workType": "MULTIPLE_CHOICE_QUESTION",
                "submissionModificationMode": "MODIFIABLE_UNTIL_TURNED_IN",
                "associatedWithDeveloper": true
            }
        }).then(function(response){
            consoleLog(response);
            if(response.status==200){
                document.getElementById("add_mcq_qestion").value = "";
                document.getElementById("add_mcq_option_1").value = "";
                document.getElementById("add_mcq_option_2").value = "";
                document.getElementById("add_mcq_option_3").value = "";
                document.getElementById("add_mcq_option_4").value = "";
                $scope.showToast('Quiz question created successfully.');
            }
            $scope.hideLoader();
        }, function(response){
            consoleLog(response);
            $scope.hideLoader();
        });
    }
 

    $scope.plotCalendar = function(){
        var calendarId = $routeParams.id;
        consoleLog(calendarId); 
        $scope.calendarLink = $sce.trustAsResourceUrl("https://calendar.google.com/calendar/embed?showTitle=0&amp;showNav=0&amp;showDate=0&amp;showPrint=0&amp;showTabs=0&amp;showCalendars=0&amp;showTz=0&amp;mode=WEEK&amp;height=600&amp;wkst=2&amp;bgcolor=%23ffffff&amp;src=classroom"+calendarId+"%40group.calendar.google.com&amp;color=%23a52714&amp;ctz=Etc%2FGMT");  
        consoleLog($scope.calendarLink); 

    };

    $scope.plotWhiteboard = function(){
        var whiteboardId = $routeParams.id;
        consoleLog(whiteboardId); 
        $scope.whiteboardLink = $sce.trustAsResourceUrl('https://awwapp.com/b/'+whiteboardId+'/');  
        consoleLog($scope.whiteboardLink); 

        /*var aww = new AwwBoard('#aww-wrapper', {
            apiKey: '2a17a37e-6fe1-45de-a518-9fa210d6f95d',
            autoJoin: true,
            boardLink: ''+whiteboardId,
            sizes: [3, 5, 8, 13, 20],
            fontSizes: [10, 12, 16, 22, 30],
            menuOrder: ['colors', 'sizes', 'tools', 'admin',
              'utils'],
            tools: ['pencil', 'eraser', 'text', 'image'],
            colors: [ "#000000", "#f44336", "#4caf50", "#2196f3",
              "#ffc107", "#9c27b0",     "#e91e63", "#795548"],
            defaultColor: "#000000",
            defaultSize: 8,
            defaultTool: 'pencil',
        });*/  

    };

    $scope.sendMail = function(emailId){
        var mail = 'https://mail.google.com/mail/?view=cm&fs=1&to='+ emailId +'&su=Student: Message Title Here.&body=Type Your Message Here.';
        $window.open(mail);
        consoleLog("Sending Mail");
    };

    $scope.openGoogleDrive = function(){
        var driveLink = $scope.course.teacherFolder.alternateLink;
        //$window.open(driveLink, '_blank');
        consoleLog("Opening Google Drive");
    };

    $scope.setPath = function(path){
        $location.path(path);
    };

    $scope.showToast = function(message){
        'use strict';
        var snackbarContainer = document.querySelector('#toast');
        var data = {
          message: message,
          timeout: 2000,
          actionHandler: null,
          actionText: ''
        };
        snackbarContainer.MaterialSnackbar.showSnackbar(data);
    };

    $scope.showLoader = function(){
        consoleLog("displaying Loader");
        document.getElementById('loader').style.display = 'inherit';
    };

    $scope.hideLoader = function(){
        consoleLog("hiding Loader");
        document.getElementById('loader').style.display  = 'none';
    };


    $scope.showAlert = function(title, body, action, actionText){
        consoleLog("displaying Alert");
        document.getElementById('alert-title').innerHTML = title;
        document.getElementById('alert-body').innerHTML = body;
        var actionHTML = '<button class="mdl-button mdl-button--raised mdl-js-button mdl-js-ripple-effect mdl-button--accent" onclick="hideAlert()"> Close </button>';
        if(action){
            actionHTML += '<button class="mdl-button mdl-button--raised mdl-js-button mdl-js-ripple-effect mdl-button--accent" onclick="'+action+'()"> '+actionText+' </button>';
        }
        document.getElementById('alert-action').innerHTML = actionHTML;
        document.getElementById('popup').style.display = 'inherit';
    };

    $scope.hideAlert = function(){
        consoleLog("hiding Alert");
        document.getElementById('popup').style.display  = 'none';
    };

});

