import React, { useContext } from 'react';
import UserMessages from './component';
import { ChatContext } from '/imports/ui/components/components-data/chat-context/context';
import { GroupChatContext } from '/imports/ui/components/components-data/group-chat-context/context';
import useContextUsers from '/imports/ui/components/components-data/users-context/service';
import Service from '/imports/ui/components/user-list/service';
import Auth from '/imports/ui/services/auth';

const UserMessagesContainer = () => {
  const usingChatContext = useContext(ChatContext);
  const usingGroupChatContext = useContext(GroupChatContext);
  const { chats: groupChatsMessages } = usingChatContext;
  const { users } = useContextUsers('user-messages');
  const meetingUsers = users ? users[Auth.meetingID] : null;
  const { groupChat: groupChats } = usingGroupChatContext;
  const activeChats = Service.getActiveChats({ groupChatsMessages, groupChats, users: meetingUsers });
  const { roving } = Service;

  return <UserMessages {...{ activeChats, roving }} />;
};

export default UserMessagesContainer;
