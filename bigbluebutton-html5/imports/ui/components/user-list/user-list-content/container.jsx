import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import Auth from '/imports/ui/services/auth';
import UserContent from './component';
import GuestUsers from '/imports/api/guest-users';
import useContextUsers from '/imports/ui/components/components-data/users-context/service';
import WaitingUsersService from '/imports/ui/components/waiting-users/service';

const UserContentContainer = (props) => {
  const { users } = useContextUsers('userlist-content');

  const isPresenter = users ? users[Auth.meetingID][Auth.userID].presenter : false;
  const userRole = users ? users[Auth.meetingID][Auth.userID].role : 'viewer';
  const { isGuestLobbyMessageEnabled } = WaitingUsersService;

  return (
    <UserContent
      {...{
        isGuestLobbyMessageEnabled,
        isPresenter,
        userRole,
        ...props,
      }}
    />
  );
};

export default withTracker(() => ({
  pendingUsers: GuestUsers.find({
    meetingId: Auth.meetingID,
    approved: false,
    denied: false,
  }).fetch(),
  isWaitingRoomEnabled: WaitingUsersService.isWaitingRoomEnabled(),
}))(UserContentContainer);
