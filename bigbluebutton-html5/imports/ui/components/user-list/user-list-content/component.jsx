import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Styled from './styles';
import UserParticipantsContainer from './user-participants/container';
import UserMessagesContainer from './user-messages/container';
import UserNotesContainer from './user-notes/container';
import UserCaptionsContainer from './user-captions/container';
import WaitingUsersContainer from './waiting-users/container';
import UserPollsContainer from './user-polls/container';
import BreakoutRoomContainer from './breakout-room/container';

const propTypes = {
  isPresenter: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
};

const CHAT_ENABLED = Meteor.settings.public.chat.enabled;
const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

class UserContent extends PureComponent {
  render() {
    const {
      isPresenter,
      userRole,
      pendingUsers,
      isWaitingRoomEnabled,
      isGuestLobbyMessageEnabled,
      compact,
    } = this.props;

    const showWaitingRoom = (isGuestLobbyMessageEnabled && isWaitingRoomEnabled)
      || pendingUsers.length > 0;

    return (
      <Styled.Content data-test="userListContent">
        {CHAT_ENABLED ? <UserMessagesContainer /> : null}
        {userRole === ROLE_MODERATOR ? <UserCaptionsContainer /> : null}
        <UserNotesContainer />
        {showWaitingRoom && userRole === ROLE_MODERATOR
          ? (
            <WaitingUsersContainer {...{ pendingUsers }} />
          ) : null}
        <UserPollsContainer isPresenter={isPresenter} />
        <BreakoutRoomContainer />
        <UserParticipantsContainer compact={compact}/>
      </Styled.Content>
    );
  }
}

UserContent.propTypes = propTypes;

export default UserContent;
