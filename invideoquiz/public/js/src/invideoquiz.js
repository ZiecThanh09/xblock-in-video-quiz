/* Javascript for InVideoQuizXBlock */
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

  var resizeIntervalTime = 100;
  var displayIntervalTime = 500;
  var displayIntervalTimeout = 1500;

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

  function getDimensions() {
    var position = $('.tc-wrapper', video).position().top;
    var height = $('.tc-wrapper', video).css('height');
    var width = $('.tc-wrapper', video).css('width');
    return {
      'top': position,
      'height': height,
      'width': width
    };
  }

  function dimensionsHaveChanged(newDimensions) {
    for (var key in knownDimensions) {
        if (newDimensions.hasOwnProperty(key)) {
            if (knownDimensions[key] !== newDimensions[key]) {
                return true;
            }
        }
    }
    return false;
  } 

  function showProblemTimesToInstructor(component) {
    $.each(problemTimesMap, function (time, componentId) {
        var isInVideoComponent = component.data('id').indexOf(componentId) !== -1;
        if (isInVideoComponent) {
            var minutes = parseInt(time / 60, 10);
            var seconds = ('0' + (time % 60)).slice(-2);
            var timeParagraph = '<p class="in-video-alert"><i class="fa fa-exclamation-circle"></i>This component will appear in the video at <strong>' + minutes + ':' + seconds + '</strong></p>';
            component.prepend(timeParagraph);
        }
    });
  }

  function resizeInVideoProblem(currentProblem, dimensions) {
      currentProblem.css(dimensions);
  }

  function bindVideoEvents() {
      var canDisplayProblem = true;
      var intervalObject;
      var resizeIntervalObject;
      var problemToDisplay;

      video.on('play', function () {
          videoState = videoState || video.data('video-player-state');
          if (problemToDisplay) {
            window.setTimeout(function () {
              canDisplayProblem = true;
            }, displayIntervalTimeout);
            problemToDisplay.hide();
            problemToDisplay = null;
          }

          intervalObject = setInterval(function () {
            var videoTime = parseInt(videoState.videoPlayer.currentTime, 10);
            var problemToDisplayId = problemTimesMap[videoTime];
            if (problemToDisplayId && canDisplayProblem) {
              $('.wrapper-downloads, .video-controls', video).hide();
              $('#seq_content .vert-mod .vert, #course-content .vert-mod .vert').each(function () {
                var isProblemToDisplay = $(this).data('id').indexOf(problemToDisplayId) !== -1;
                if (isProblemToDisplay) {
                          problemToDisplay = $('.xblock-student_view', this);
                          videoState.videoPlayer.pause();
                          resizeInVideoProblem(problemToDisplay, getDimensions());
                          problemToDisplay.show();
                          problemToDisplay.css({display: 'block'});
                          var countdownTime = parseInt($('.countdown-time', problemToDisplay).val(), 10) || 10;
                          console.log("Countdown Time:", countdownTime);
                          startCountdown(problemToDisplay, countdownTime);
                          
                          canDisplayProblem = false;
                      }
                  });
              }
          }, displayIntervalTime);
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
