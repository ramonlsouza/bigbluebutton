import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { defineMessages, injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import Auth from '/imports/ui/services/auth';
import AuthTokenValidation from '/imports/api/auth-token-validation';
import Users from '/imports/api/users';
import Meetings from '/imports/api/meetings';
import { notify } from '/imports/ui/services/notification';
import CaptionsContainer from '/imports/ui/components/captions/container';
import CaptionsService from '/imports/ui/components/captions/service';
import getFromUserSettings from '/imports/ui/services/users-settings';
import deviceInfo from '/imports/utils/deviceInfo';
import UserInfos from '/imports/api/users-infos';
import Settings from '/imports/ui/services/settings';
import MediaService from '/imports/ui/components/media/service';
import {
  layoutSelect,
  layoutSelectInput,
  layoutSelectOutput,
  layoutDispatch,
} from '../layout/context';

import {
  getFontSize,
  getBreakoutRooms,
  validIOSVersion,
} from './service';

import { withModalMounter } from '../modal/service';

import App from './component';
import ActionsBarContainer from '../actions-bar/container';

const CUSTOM_STYLE_URL = Meteor.settings.public.app.customStyleUrl;

const propTypes = {
  actionsbar: PropTypes.node,
  meetingLayout: PropTypes.string.isRequired,
};

const defaultProps = {
  actionsbar: <ActionsBarContainer />,
};

const intlMessages = defineMessages({
  waitingApprovalMessage: {
    id: 'app.guest.waiting',
    description: 'Message while a guest is waiting to be approved',
  },
});

const endMeeting = (code) => {
  Session.set('codeError', code);
  Session.set('isMeetingEnded', true);
};

const AppContainer = (props) => {
  const {
    actionsbar,
    meetingLayout,
    settingsLayout,
    pushLayoutToEveryone,
    currentUserId,
    shouldShowPresentation: propsShouldShowPresentation,
    ...otherProps
  } = props;

  const sidebarContent = layoutSelectInput((i) => i.sidebarContent);
  const sidebarNavigation = layoutSelectInput((i) => i.sidebarNavigation);
  const actionsBarStyle = layoutSelectOutput((i) => i.actionBar);
  const captionsStyle = layoutSelectOutput((i) => i.captions);
  const presentation = layoutSelectInput((i) => i.presentation);
  const layoutType = layoutSelect((i) => i.layoutType);
  const deviceType = layoutSelect((i) => i.deviceType);
  const layoutContextDispatch = layoutDispatch();

  const { sidebarContentPanel, isOpen: sidebarContentIsOpen } = sidebarContent;
  const { sidebarNavPanel, isOpen: sidebarNavigationIsOpen } = sidebarNavigation;
  const { isOpen: presentationIsOpen } = presentation;
  const shouldShowPresentation = propsShouldShowPresentation && presentationIsOpen;

  return currentUserId
    ? (
      <App
        {...{
          actionsbar,
          actionsBarStyle,
          captionsStyle,
          currentUserId,
          layoutType,
          meetingLayout,
          settingsLayout,
          pushLayoutToEveryone,
          deviceType,
          layoutContextDispatch,
          sidebarNavPanel,
          sidebarNavigationIsOpen,
          sidebarContentPanel,
          sidebarContentIsOpen,
          shouldShowPresentation,
        }}
        {...otherProps}
      />
    )
    : null;
};

const currentUserEmoji = (currentUser) => (currentUser
  ? {
    status: currentUser.emoji,
    changedAt: currentUser.emojiTime,
  }
  : {
    status: 'none',
    changedAt: null,
  }
);

export default injectIntl(withModalMounter(withTracker(({ intl, baseControls }) => {
  const authTokenValidation = AuthTokenValidation.findOne({}, { sort: { updatedAt: -1 } });

  if (authTokenValidation.connectionId !== Meteor.connection._lastSessionId) {
    endMeeting('403');
  }

  Users.find({ userId: Auth.userID, meetingId: Auth.meetingID }).observe({
    removed() {
      endMeeting('403');
    },
  });

  const currentUser = Users.findOne(
    { userId: Auth.userID },
    {
      fields:
      {
        approved: 1, emoji: 1, userId: 1, presenter: 1,
      },
    },
  );
  const currentMeeting = Meetings.findOne({ meetingId: Auth.meetingID },
    {
      fields: {
        publishedPoll: 1,
        voiceProp: 1,
        randomlySelectedUser: 1,
        layout: 1,
      },
    });
  const {
    publishedPoll,
    voiceProp,
    randomlySelectedUser,
    layout,
  } = currentMeeting;

  if (currentUser && !currentUser.approved) {
    baseControls.updateLoadingState(intl.formatMessage(intlMessages.waitingApprovalMessage));
  }

  const UserInfo = UserInfos.find({
    meetingId: Auth.meetingID,
    requesterUserId: Auth.userID,
  }).fetch();

  const AppSettings = Settings.application;
  const { viewScreenshare } = Settings.dataSaving;
  const shouldShowExternalVideo = MediaService.shouldShowExternalVideo();
  const shouldShowScreenshare = MediaService.shouldShowScreenshare()
    && (viewScreenshare || MediaService.isUserPresenter()) && !shouldShowExternalVideo;
  let customStyleUrl = getFromUserSettings('bbb_custom_style_url', false);

  if (!customStyleUrl && CUSTOM_STYLE_URL) {
    customStyleUrl = CUSTOM_STYLE_URL;
  }

  return {
    captions: CaptionsService.isCaptionsActive() ? <CaptionsContainer /> : null,
    fontSize: getFontSize(),
    hasBreakoutRooms: getBreakoutRooms().length > 0,
    customStyle: getFromUserSettings('bbb_custom_style', false),
    customStyleUrl,
    UserInfo,
    notify,
    validIOSVersion,
    isPhone: deviceInfo.isPhone,
    isRTL: document.documentElement.getAttribute('dir') === 'rtl',
    meetingMuted: voiceProp.muteOnStart,
    currentUserEmoji: currentUserEmoji(currentUser),
    hasPublishedPoll: publishedPoll,
    randomlySelectedUser,
    currentUserId: currentUser?.userId,
    isPresenter: currentUser?.presenter,
    meetingLayout: layout,
    settingsLayout: AppSettings.selectedLayout,
    pushLayoutToEveryone: AppSettings.pushLayoutToEveryone,
    audioAlertEnabled: AppSettings.chatAudioAlerts,
    pushAlertEnabled: AppSettings.chatPushAlerts,
    shouldShowScreenshare,
    shouldShowPresentation: !shouldShowScreenshare && !shouldShowExternalVideo,
    shouldShowExternalVideo,
    isLargeFont: Session.get('isLargeFont'),
  };
})(AppContainer)));

AppContainer.defaultProps = defaultProps;
AppContainer.propTypes = propTypes;
