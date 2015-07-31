// Copyright 2014 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Controller for the conversation skin.
 *
 * @author sll@google.com (Sean Lip)
 */

var TIME_FADEOUT_MSEC = 100;
var TIME_HEIGHT_CHANGE_MSEC = 500;
var TIME_FADEIN_MSEC = 100;
var TIME_NUM_CARDS_CHANGE_MSEC = 500;

oppia.animation('.conversation-skin-animate-card-contents', function() {
  var animateCardChange = function(element, className, done) {
    if (className !== 'animate-card-change') {
      return;
    }

    var currentHeight = element.height();
    var expectedNextHeight = $('#futurePreview').height();

    // Fix the current card height, so that it does not change during the
    // animation, even though its contents might.
    element.css('height', currentHeight);

    jQuery(element).animate({
      opacity: 0
    }, TIME_FADEOUT_MSEC).animate({
      height: expectedNextHeight
    }, TIME_HEIGHT_CHANGE_MSEC).animate({
      opacity: 1
    }, TIME_FADEIN_MSEC, function() {
      element.css('height', '');
      done();
    });

    return function(cancel) {
      if (cancel) {
        element.css('opacity', '1.0');
        element.css('height', '');
        element.stop();
      }
    };
  };

  return {
    addClass: animateCardChange
  };
});

oppia.animation('.conversation-skin-animate-cards', function() {
  var animateMoveTutorCardLeft = function(element, className, done) {
    if (className !== 'animate-move-tutor-card-left') {
      return;
    }

    var cardElt = jQuery(element).find('.conversation-skin-tutor-card');
    var supplementalInteractionElt = jQuery(element).find(
      '.conversation-skin-supplemental-interaction');

    supplementalInteractionElt.css('opacity', '0');

    cardElt.animate({
      'margin-left': '0'
    }, TIME_NUM_CARDS_CHANGE_MSEC, function() {
      cardElt.css('margin-left', '0');
      cardElt.css('margin-right', '');
      cardElt.css('float', 'left');

      supplementalInteractionElt.animate({
        'opacity': '1'
      }, 50, function() {
        supplementalInteractionElt.css('opacity', '1');
        done();
      });
    });

    return function(cancel) {
      if (cancel) {
        cardElt.css('margin-left', '0');
        cardElt.css('margin-right', '');
        cardElt.css('float', 'left');
        cardElt.stop();

        supplementalInteractionElt.css('opacity', '1');
        supplementalInteractionElt.stop();
      }
    };
  };

  var animateMoveTutorCardCenter = function(element, className, done) {
    if (className !== 'animate-move-tutor-card-left') {
      return;
    }

    var cardElt = jQuery(element).find('.conversation-skin-tutor-card');
    var supplementalInteractionElt = jQuery(element).find(
      '.conversation-skin-supplemental-interaction');

    supplementalInteractionElt.css('opacity', '0');
    cardElt.animate({
      'margin-left': '306px'
    }, TIME_NUM_CARDS_CHANGE_MSEC, function() {
      cardElt.css('margin-left', 'auto');
      cardElt.css('margin-right', 'auto');
      cardElt.css('float', '');
      done();
    });

    return function(cancel) {
      if (cancel) {
        cardElt.css('margin-left', 'auto');
        cardElt.css('margin-right', 'auto');
        cardElt.css('float', '');
        cardElt.stop();

        supplementalInteractionElt.css('opacity', '0');
        supplementalInteractionElt.stop();
      }
    };
  };

  return {
    addClass: animateMoveTutorCardLeft,
    removeClass: animateMoveTutorCardCenter
  };
});


// TODO(sll): delete/deprecate 'reset exploration' from the list of
// events sent to a container page.

oppia.directive('conversationSkin', [function() {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'skins/Conversation',
    controller: [
        '$scope', '$timeout', '$rootScope', '$window', 'messengerService',
        'oppiaPlayerService', 'urlService', 'focusService', 'ratingService',
        function(
          $scope, $timeout, $rootScope, $window, messengerService,
          oppiaPlayerService, urlService, focusService, ratingService) {

      $scope.CONTINUE_BUTTON_FOCUS_LABEL = 'continueButton';

      // The minimum number of milliseconds that should elapse before Oppia
      // responds, so that the transition isn't too sudden.
      var MIN_WAIT_TIME_MILLISECS = 1000;

      var hasInteractedAtLeastOnce = false;
      var _answerIsBeingProcessed = false;
      var _nextFocusLabel = null;

      $scope.isInPreviewMode = oppiaPlayerService.isInPreviewMode();
      $scope.isLoggedIn = oppiaPlayerService.isLoggedIn();
      $scope.isIframed = urlService.isIframed();
      $rootScope.loadingMessage = 'Loading';
      // This will be replaced with the dataURI representation of the
      // user-uploaded profile image, if it exists.
      $scope.profilePicture = '/images/general/user_blue_72px.png';
      $scope.finished = false;

      $scope.activeCard = null;
      $scope.numProgressDots = 0;
      $scope.currentProgressDotIndex = null;
      $scope.arePreviousResponsesShown = false;

      $scope.waitingForContinueButtonClick = false;

      $scope.upcomingStateName = null;
      $scope.upcomingContentHtml = null;
      $scope.upcomingInlineInteractionHtml = null;

      // If the exploration is iframed, send data to its parent about its
      // height so that the parent can be resized as necessary.
      $scope.lastRequestedHeight = 0;
      $scope.lastRequestedScroll = false;
      $scope.adjustPageHeight = function(scroll, callback) {
        $timeout(function() {
          var newHeight = document.body.scrollHeight;
          if (Math.abs($scope.lastRequestedHeight - newHeight) > 50.5 ||
              (scroll && !$scope.lastRequestedScroll)) {
            // Sometimes setting iframe height to the exact content height still
            // produces scrollbar, so adding 50 extra px.
            newHeight += 50;
            messengerService.sendMessage(messengerService.HEIGHT_CHANGE,
              {height: newHeight, scroll: scroll});
            $scope.lastRequestedHeight = newHeight;
            $scope.lastRequestedScroll = scroll;
          }

          if (callback) {
            callback();
          }
        }, 100);
      };

      // Changes the currently-active card, and resets the 'show previous
      // responses' setting.
      var _navigateToCard = function(index) {
        $scope.activeCard = $scope.transcript[index];
        $scope.arePreviousResponsesShown = false;
        $scope.interactionIsInline = oppiaPlayerService.isInteractionInline(
          $scope.activeCard.stateName);
      };

      var _addNewCard = function(
          stateName, contentHtml, interactionHtml, interactionIsInline) {
        oppiaPlayerService.applyCachedParamUpdates();
        $scope.transcript.push({
          stateName: stateName,
          content: contentHtml,
          interaction: interactionHtml,
          interactionIsInline: interactionIsInline,
          interactionIsDisabled: false,
          answerFeedbackPairs: []
        });

        $scope.numProgressDots++;
        $scope.currentProgressDotIndex = $scope.numProgressDots - 1;

        _navigateToCard($scope.transcript.length - 1);
      };

      $scope.toggleShowPreviousResponses = function() {
        $scope.arePreviousResponsesShown = !$scope.arePreviousResponsesShown;
      };

      $scope.initializePage = function() {
        $scope.transcript = [];
        $scope.interactionIsInline = false;
        $scope.waitingForOppiaFeedback = false;
        hasInteractedAtLeastOnce = false;

        oppiaPlayerService.init(function(stateName, initHtml) {
          _nextFocusLabel = focusService.generateFocusLabel();
          $scope.gadgetPanelsContents = (
            oppiaPlayerService.getGadgetPanelsContents());

          _addNewCard(
            stateName,
            initHtml,
            oppiaPlayerService.getInteractionHtml(stateName, _nextFocusLabel),
            oppiaPlayerService.isInteractionInline(stateName));
          $rootScope.loadingMessage = '';

          $scope.adjustPageHeight(false, null);
          $window.scrollTo(0, 0);
          focusService.setFocus(_nextFocusLabel);
        });
      };

      $scope.submitAnswer = function(answer) {
        // For some reason, answers are getting submitted twice when the submit
        // button is clicked. This guards against that.
        if (_answerIsBeingProcessed) {
          return;
        }

        _answerIsBeingProcessed = true;
        hasInteractedAtLeastOnce = true;
        $scope.waitingForOppiaFeedback = true;

        var _oldStateName = (
          $scope.transcript[$scope.transcript.length - 1].stateName);
        $scope.transcript[$scope.transcript.length - 1].answerFeedbackPairs.push({
          learnerAnswer: oppiaPlayerService.getAnswerAsHtml(answer),
          oppiaFeedback: null
        });

        // This is measured in milliseconds since the epoch.
        var timeAtServerCall = new Date().getTime();

        oppiaPlayerService.submitAnswer(answer, function(
            newStateName, refreshInteraction, feedbackHtml, contentHtml) {
          var millisecsLeftToWait = Math.max(
            MIN_WAIT_TIME_MILLISECS - (new Date().getTime() - timeAtServerCall),
            1.0);

          $scope.waitingForOppiaFeedback = false;
          var pairs = (
            $scope.transcript[$scope.transcript.length - 1].answerFeedbackPairs);
          var lastAnswerFeedbackPair = pairs[pairs.length - 1];

          if (_oldStateName === newStateName) {
            // Stay on the same card.
            lastAnswerFeedbackPair.oppiaFeedback = feedbackHtml;
            if (refreshInteraction) {
              // Replace the previous interaction (even though it might be of
              // the same type).
              _nextFocusLabel = focusService.generateFocusLabel();
              $scope.transcript[$scope.transcript.length - 1].interaction = (
                oppiaPlayerService.getInteractionHtml(newStateName, _nextFocusLabel) +
                oppiaPlayerService.getRandomSuffix());
            }

            focusService.setFocus(_nextFocusLabel);
          } else {
            // There is a new card. Disable the current interaction -- then, if
            // there is no feedback, move on immediately. Otherwise, give the
            // learner a chance to read the feedback, and display a 'Continue'
            // button.
            $scope.transcript[$scope.transcript.length - 1].interactionIsDisabled = true;

            _nextFocusLabel = focusService.generateFocusLabel();

            // These are used to compute the dimensions for the next card.
            $scope.upcomingStateName = newStateName;
            $scope.upcomingContentHtml = (
              contentHtml + oppiaPlayerService.getRandomSuffix());
            var _isNextInteractionInline = oppiaPlayerService.isInteractionInline(
              newStateName);
            $scope.upcomingInlineInteractionHtml = (
              _isNextInteractionInline ?
              oppiaPlayerService.getInteractionHtml(
                newStateName, _nextFocusLabel
              ) + oppiaPlayerService.getRandomSuffix() : '');

            if (feedbackHtml) {
              lastAnswerFeedbackPair.oppiaFeedback = feedbackHtml;
              $scope.waitingForContinueButtonClick = true;
              focusService.setFocus($scope.CONTINUE_BUTTON_FOCUS_LABEL);
            } else {
              // Note that feedbackHtml is an empty string if no feedback has
              // been specified. This causes the answer-feedback pair to change
              // abruptly, so we make the change only after the animation has
              // completed.
              $scope.showPendingCard(
                newStateName,
                contentHtml + oppiaPlayerService.getRandomSuffix(),
                function() {
                  lastAnswerFeedbackPair.oppiaFeedback = feedbackHtml;
                });
            }
          }

          $scope.finished = oppiaPlayerService.isStateTerminal(newStateName);
          _answerIsBeingProcessed = false;
        }, true);
      };

      $scope.startCardChangeAnimation = false;
      $scope.showPendingCard = function(newStateName, newContentHtml, successCallback) {
        $scope.waitingForContinueButtonClick = false;
        $scope.startCardChangeAnimation = true;

        $timeout(function() {
          _addNewCard(
            newStateName,
            newContentHtml,
            oppiaPlayerService.getInteractionHtml(
              newStateName, _nextFocusLabel) + oppiaPlayerService.getRandomSuffix(),
            oppiaPlayerService.isInteractionInline(newStateName));

          $scope.upcomingStateName = null;
          $scope.upcomingContentHtml = null;
          $scope.upcomingInlineInteractionHtml = null;
        }, TIME_FADEOUT_MSEC + 0.1 * TIME_HEIGHT_CHANGE_MSEC);

        $timeout(function() {
          focusService.setFocus(_nextFocusLabel);
        }, TIME_FADEOUT_MSEC + TIME_HEIGHT_CHANGE_MSEC + 0.5 * TIME_FADEIN_MSEC);

        $timeout(function() {
          $scope.startCardChangeAnimation = false;
          if (successCallback) {
            successCallback();
          }
        }, TIME_FADEOUT_MSEC + TIME_HEIGHT_CHANGE_MSEC + TIME_FADEIN_MSEC + 10);
      };

      $scope.submitUserRating = function(ratingValue) {
        ratingService.submitUserRating(ratingValue);
      };
      $scope.$on('ratingUpdated', function() {
        $scope.userRating = ratingService.getUserRating();
      });

      $scope.$watch('currentProgressDotIndex', function(newValue) {
        if (newValue !== null) {
          _navigateToCard(newValue);
        }
      });

      $scope.isWindowNarrow = function() {
        return $(window).width() < 700;
      };

      $window.addEventListener('beforeunload', function(e) {
        if (hasInteractedAtLeastOnce && !$scope.finished &&
            !$scope.isInPreviewMode) {
          oppiaPlayerService.registerMaybeLeaveEvent();
          var confirmationMessage = (
            'If you navigate away from this page, your progress on the ' +
            'exploration will be lost.');
          (e || $window.event).returnValue = confirmationMessage;
          return confirmationMessage;
        }
      });

      $window.onresize = function() {
        $scope.adjustPageHeight(false, null);
      };

      $scope.initializePage();
      ratingService.init(function(userRating) {
        $scope.userRating = userRating;
      });

      oppiaPlayerService.getUserProfileImage().then(function(result) {
        $scope.profilePicture = result;
      });
    }]
  };
}]);

oppia.directive('answerFeedbackPair', [function() {
  return {
    restrict: 'E',
    scope: {
      answer: '&',
      feedback: '&',
      profilePicture: '&'
    },
    templateUrl: 'components/answerFeedbackPair'
  };
}]);

oppia.directive('progressDots', [function() {
  return {
    restrict: 'E',
    scope: {
      getNumDots: '&numDots',
      currentDotIndex: '='
    },
    templateUrl: 'components/progressDots',
    controller: ['$scope', function($scope) {

      $scope.dots = [];
      var initialDotCount = $scope.getNumDots();
      for (var i = 0; i < initialDotCount; i++) {
        $scope.dots.push({});
      }

      $scope.$watch(function() {
        return $scope.getNumDots();
      }, function(newValue) {
        var oldValue = $scope.dots.length;

        if (newValue === oldValue) {
          return;
        } else if (newValue === oldValue + 1) {
          $scope.dots.push({});
          $scope.currentDotIndex = $scope.dots.length - 1;
        } else {
          throw Error(
            'Unexpected change to number of dots from ' + oldValue + ' to ' +
            newValue);
        }
      });

      $scope.changeActiveDot = function(index) {
        $scope.currentDotIndex = index;
      };
    }]
  };
}]);
