import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import ChatAlert from './component';
import { layoutSelect, layoutSelectInput, layoutDispatch } from '../../layout/context';
import { PANELS } from '../../layout/enums';
import { ChatContext } from '/imports/ui/components/components-data/chat-context/context';
import UNREAD_CHATS_SUBSCRIPTION from './queries';
import { useSubscription } from '@apollo/client';
import UnreadMessages from '/imports/ui/services/unread-messages';

const PUBLIC_CHAT_ID = Meteor.settings.public.chat.public_group_id;

const propTypes = {
  audioAlertEnabled: PropTypes.bool.isRequired,
  pushAlertEnabled: PropTypes.bool.isRequired,
};

const ChatAlertContainer = (props) => {
  const idChatOpen = layoutSelect((i) => i.idChatOpen);
  const sidebarContent = layoutSelectInput((i) => i.sidebarContent);
  const { sidebarContentPanel } = sidebarContent;
  const layoutContextDispatch = layoutDispatch();

  const { audioAlertEnabled, pushAlertEnabled } = props;

  let idChat = idChatOpen;
  if (sidebarContentPanel !== PANELS.CHAT) idChat = '';

  const usingChatContext = useContext(ChatContext);

  const { chats: groupChatsMessages } = usingChatContext;

  const { data: chatData } = useSubscription(UNREAD_CHATS_SUBSCRIPTION);
  const chat = chatData?.chat || [];

  // audio alerts
  const unreadMessagesCountByChat = audioAlertEnabled && chat
    ? chat.map((chatItem) => ({
      chatId: chatItem.chatId, unreadCounter: chatItem.totalUnread,
    }))
    : null;

  // push alerts
  const unreadMessagesByChat = pushAlertEnabled
    ? chat.filter(
      (chatItem) => chatItem.totalUnread > 0 && chatItem.chatId !== idChat,
    ).map((chatItem) => {
      const chatId = (chatItem.chatId === 'public') ? PUBLIC_CHAT_ID : chatItem.chatId;
      return UnreadMessages.getUnreadMessages(chatId, groupChatsMessages);
    })
    : null;

  return (
    <ChatAlert
      {...props}
      layoutContextDispatch={layoutContextDispatch}
      unreadMessagesCountByChat={unreadMessagesCountByChat}
      unreadMessagesByChat={unreadMessagesByChat}
      idChatOpen={idChat}
    />
  );
};

ChatAlertContainer.propTypes = propTypes;

export default ChatAlertContainer;
