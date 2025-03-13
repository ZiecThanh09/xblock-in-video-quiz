/* Javascript for InVideoQuizXBlock with Countdown Timer */
function InVideoQuizXBlock(runtime, element) {
  $('.in-video-quiz-block').closest('.vert').hide();
  var videoId = $('.in-video-quiz-block').data('videoid');
  if (!videoId || !InVideoQuizXBlock.config.hasOwnProperty(videoId)) {
      return;
  }
  var problemTimesMap = InVideoQuizXBlock.config[videoId];
  var studentMode = $('.in-video-quiz-block').data('mode') !== 'staff';
  var video;
  var videoState;
  var knownDimensions;
  
  $(function () {
      $('#seq_content .vert-mod .vert, #course-content .vert-mod .vert').each(function () {
          var component = $(this);
          if (studentMode) {
              setUpStudentView(component);
          } else {
              showProblemTimesToInstructor(component);
          }
      });
      if (studentMode) {
          knownDimensions = getDimensions();
          bindVideoEvents();
      }
  });

  function setUpStudentView(component) {
      var componentIsVideo = component.data('id').indexOf(videoId) !== -1;
      if (componentIsVideo) {
          video = $('.video', component);
      } else {
          $.each(problemTimesMap, function (time, componentId) {
              if (component.data('id').indexOf(componentId) !== -1) {
                  component.addClass('in-video-problem-wrapper');
                  var countdownInput = '<label for="countdown-time">Countdown Time (seconds):</label>' +
                                       '<input type="number" class="countdown-time" min="1" max="60" value="10">';
                  var countdownTimer = '<div class="countdown-timer">10</div>';
                  $('.xblock-student_view', component).append(countdownInput + countdownTimer).addClass('in-video-problem').hide();
              }
          });
      }
  }

  function bindVideoEvents() {
      var canDisplayProblem = true;
      var intervalObject;
      var problemToDisplay;

      video.on('play', function () {
          videoState = videoState || video.data('video-player-state');
          if (problemToDisplay) {
              problemToDisplay.hide();
              problemToDisplay = null;
              canDisplayProblem = true;
          }
          intervalObject = setInterval(function () {
              var videoTime = parseInt(videoState.videoPlayer.currentTime, 10);
              var problemToDisplayId = problemTimesMap[videoTime];
              if (problemToDisplayId && canDisplayProblem) {
                  $('.wrapper-downloads, .video-controls', video).hide();
                  $('#seq_content .vert-mod .vert, #course-content .vert-mod .vert').each(function () {
                      if ($(this).data('id').indexOf(problemToDisplayId) !== -1) {
                          problemToDisplay = $('.xblock-student_view', this);
                          videoState.videoPlayer.pause();
                          problemToDisplay.show();
                          
                          var countdownTime = parseInt($('.countdown-time', problemToDisplay).val(), 10) || 10;
                          console.log("Countdown Time:", countdownTime); // Debugging
                          startCountdown(problemToDisplay, countdownTime);
                          
                          canDisplayProblem = false;
                      }
                  });
              }
          }, 500);
      });
  }

  function startCountdown(problemElement, duration) {
      var timerElement = $('.countdown-timer', problemElement);
      var timeLeft = duration;
      timerElement.text(timeLeft);

      var countdown = setInterval(function () {
          timeLeft--;
          timerElement.text(timeLeft);
          if (timeLeft <= 0) {
              clearInterval(countdown);
              problemElement.fadeOut();
              $('.wrapper-downloads, .video-controls', video).show();
              videoState.videoPlayer.play();
          }
      }, 1000);
  }
}
