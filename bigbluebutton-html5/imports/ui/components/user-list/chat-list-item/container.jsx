import React from 'react';
import ChatListItem from './component';
import { layoutSelect, layoutSelectInput, layoutDispatch } from '../../layout/context';
import Service from '/imports/ui/components/user-list/service';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import browserInfo from '/imports/utils/browserInfo';

const { isChrome, isFirefox, isEdge } = browserInfo;


const ChatListItemContainer = (props) => {
  const sidebarContent = layoutSelectInput((i) => i.sidebarContent);
  const idChatOpen = layoutSelect((i) => i.idChatOpen);
  const layoutContextDispatch = layoutDispatch();

  const { sidebarContentPanel } = sidebarContent;
  const sidebarContentIsOpen = sidebarContent.isOpen;

  const { isPublicChat } = Service;

  const Settings = getSettingsSingletonInstance();
  const { animations } = Settings.application;

  const hasPadding = isChrome || isFirefox || isEdge;

  return (
    <ChatListItem
      {...{
        sidebarContentIsOpen,
        sidebarContentPanel,
        layoutContextDispatch,
        idChatOpen,
        isPublicChat,
        animations,
        hasPadding,
        ...props,
      }}
    />
  );
};

export default ChatListItemContainer;
