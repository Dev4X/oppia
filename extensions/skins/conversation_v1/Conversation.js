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
      $scope.profilePicture = '/images/general/user_mint_48px.png';
      $scope.finished = false;

      $scope.activeCard = null;
      $scope.numProgressDots = 0;
      $scope.currentProgressDotIndex = null;
      $scope.arePreviousResponsesShown = false;

      $scope.upcomingStateName = null;
      $scope.upcomingContentHtml = null;
      $scope.upcomingInteractionHtml = null;

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
      };

      var _addNewCard = function(stateName, contentHtml) {
        $scope.transcript.push({
          stateName: stateName,
          content: contentHtml,
          answerFeedbackPairs: []
        });

        $scope.numProgressDots++;
        $scope.currentProgressDotIndex = $scope.numProgressDots - 1;

        _navigateToCard($scope.transcript.length - 1);
      };

      $scope.showPreviousResponses = function() {
        $scope.arePreviousResponsesShown = true;
      };

      $scope.initializePage = function() {
        $scope.transcript = [];
        $scope.interactionHtml = '';
        $scope.interactionIsInline = false;
        $scope.waitingForOppiaFeedback = false;
        hasInteractedAtLeastOnce = false;

        oppiaPlayerService.init(function(stateName, initHtml) {
          _nextFocusLabel = focusService.generateFocusLabel();
          $scope.interactionHtml = oppiaPlayerService.getInteractionHtml(
            stateName, _nextFocusLabel);
          $scope.interactionIsInline = oppiaPlayerService.isInteractionInline(
            stateName);
          $scope.gadgetPanelsContents = (
            oppiaPlayerService.getGadgetPanelsContents());

          _addNewCard(stateName, initHtml);
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

          if (feedbackHtml) {
            var pairs = (
              $scope.transcript[$scope.transcript.length - 1].answerFeedbackPairs);
            pairs[pairs.length - 1].oppiaFeedback = feedbackHtml;

            if (_oldStateName === newStateName) {
              if (refreshInteraction) {
                // Replace the previous interaction (even though it might be of
                // the same type).
                _nextFocusLabel = focusService.generateFocusLabel();
                $scope.interactionHtml = oppiaPlayerService.getInteractionHtml(
                  newStateName, _nextFocusLabel) + oppiaPlayerService.getRandomSuffix();
                $scope.interactionIsInline = oppiaPlayerService.isInteractionInline(
                  newStateName);
              }

              focusService.setFocus(_nextFocusLabel);
            } else {
              // There is feedback, and a new card after that. Move on to the
              // new card after giving the learner a chance to read the
              // feedback.
              $scope.interactionHtml = '';

              $scope.upcomingStateName = newStateName;
              $scope.upcomingContentHtml = (
                contentHtml + oppiaPlayerService.getRandomSuffix());
              _nextFocusLabel = focusService.generateFocusLabel();
              $scope.upcomingInteractionHtml = oppiaPlayerService.getInteractionHtml(
                newStateName, _nextFocusLabel) + oppiaPlayerService.getRandomSuffix();
            }
          } else {
            // There is no feedback. Move to the new card.
            oppiaPlayerService.applyCachedParamUpdates();
            _addNewCard(
              newStateName,
              contentHtml + oppiaPlayerService.getRandomSuffix());
            _nextFocusLabel = focusService.generateFocusLabel();
            $scope.interactionHtml = oppiaPlayerService.getInteractionHtml(
              newStateName, _nextFocusLabel) + oppiaPlayerService.getRandomSuffix();
            focusService.setFocus(_nextFocusLabel);
          }

          $scope.finished = oppiaPlayerService.isStateTerminal(newStateName);
          _answerIsBeingProcessed = false;
        });
      };

      $scope.showPendingCard = function() {
        _addNewCard($scope.upcomingStateName, $scope.upcomingContentHtml);
        $scope.interactionHtml = $scope.upcomingInteractionHtml;
        focusService.setFocus(_nextFocusLabel);

        $scope.upcomingStateName = null;
        $scope.upcomingContentHtml = null;
        $scope.upcomingInteractionHtml = null;
      };

      $scope.submitUserRating = function(ratingValue) {
        ratingService.submitUserRating(ratingValue);
      };
      $scope.$on('ratingUpdated', function() {
        $scope.userRating = ratingService.getUserRating();
      });

      $scope.$watch('currentProgressDotIndex', function(newValue) {
        _navigateToCard(newValue);
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
