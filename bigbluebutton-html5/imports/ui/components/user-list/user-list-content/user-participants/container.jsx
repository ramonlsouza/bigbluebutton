import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import UserListService from '/imports/ui/components/user-list/service';
import UserParticipants from './component';
import { meetingIsBreakout } from '/imports/ui/components/app/service';
import ChatService from '/imports/ui/components/chat/service';
import Auth from '/imports/ui/services/auth';
import VideoService from '/imports/ui/components/video-provider/service';
import WhiteboardService from '/imports/ui/components/whiteboard/service';
import useContextUsers from '/imports/ui/components/components-data/users-context/service';

const UserParticipantsContainer = (props) => {
  const {
    formatUsers,
    setEmojiStatus,
    clearAllEmojiStatus,
    roving,
    requestUserInformation,
  } = UserListService;

  const { videoUsers, whiteboardUsers } = props;
  const { users: contextUsers, isReady } = useContextUsers('userlist');

  if (!contextUsers) return null;

  const currentUser = contextUsers[Auth.meetingID][Auth.userID];

  const currentUserId = currentUser ? currentUser.userId : null;
  const isUserLocked = currentUser ? currentUser.locked : true;
  const isPresenter = currentUser ? currentUser.presenter : false;
  const currentUserRole = currentUser ? currentUser.role : 'viewer';

  const usersArray = Object.values(contextUsers[Auth.meetingID]);
  const users = formatUsers(usersArray, videoUsers, whiteboardUsers);

  return (
    <UserParticipants {
    ...{
      currentUserId,
      isUserLocked,
      isPresenter,
      currentUserRole,
      users,
      setEmojiStatus,
      clearAllEmojiStatus,
      roving,
      requestUserInformation,
      isReady,
      ...props,
    }
  }
    />
  );
};

export default withTracker(() => {
  ChatService.removePackagedClassAttribute(
    ['ReactVirtualized__Grid', 'ReactVirtualized__Grid__innerScrollContainer'],
    'role',
  );

  const whiteboardId = WhiteboardService.getCurrentWhiteboardId();
  const whiteboardUsers = whiteboardId ? WhiteboardService.getMultiUser(whiteboardId) : null;

  return ({
    meetingIsBreakout: meetingIsBreakout(),
    videoUsers: VideoService.getUsersIdFromVideoStreams(),
    whiteboardUsers,
  });
})(UserParticipantsContainer);
