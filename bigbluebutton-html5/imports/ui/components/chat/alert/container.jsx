import React, { memo, useContext } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import Settings from '/imports/ui/services/settings';
import ChatAlert from './component';
import Auth from '/imports/ui/services/auth';
import { UsersContext } from '/imports/ui/components/components-data/users-context/context';
import { withChatConsumer } from '/imports/ui/components/components-data/chat-context/context';
import { withGroupChatConsumer } from '/imports/ui/components/components-data/group-chat-context/context';
import userListService from '/imports/ui/components/user-list/service';

const ChatAlertContainer = (props) => {
  const usingUsersContext = useContext(UsersContext);

  const { users } = usingUsersContext;
  const currentUser = users[Auth.meetingID][Auth.userID];
  const { authTokenValidatedTime } = currentUser;

  const {
    groupChat,
    chats,
    ...restProps
  } = props;

  return (
    <ChatAlert {...restProps} messages={chats} joinTimestamp={authTokenValidatedTime}/>
  );
};

export default withChatConsumer(withGroupChatConsumer(withTracker(({ chats, groupChat }) => {
  const AppSettings = Settings.application;

  const openPanel = Session.get('openPanel');
  let idChatOpen = Session.get('idChatOpen');

  // Currently the panel can switch from the chat panel to something else and the idChatOpen won't
  // always reset. A better solution would be to make the openPanel Session variable an
  // Object { panelType: <String>, panelOptions: <Object> } and then get rid of idChatOpen
  if (openPanel !== 'chat') {
    idChatOpen = '';
  }

  const activeChats = userListService.getActiveChats({ groupChatsMessages: chats, groupChats: groupChat }).map((item) => {
    return {chatId:item.chatId, userId:item.userId, unreadCounter: item.unreadCounter};
  });

  let hasUnreadMessages = false;

  for(chat in chats){
    if(chats[chat].unreadTimeWindows.size > 0){
      hasUnreadMessages = true;
    }
  }  

  return {
    audioAlertDisabled: !AppSettings.chatAudioAlerts,
    pushAlertDisabled: !AppSettings.chatPushAlerts,
    publicChatId: Meteor.settings.public.chat.public_group_id,
    idChatOpen,
    activeChats,
    hasUnreadMessages
  };
})(memo(ChatAlertContainer))));
