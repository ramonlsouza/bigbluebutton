/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useContext, useEffect, useState } from 'react';
import { PluginsContext } from '/imports/ui/components/components-data/plugin-context/context';
import { UpdatedEventDetailsForChatMessageDomElements } from 'bigbluebutton-html-plugin-sdk/dist/cjs/dom-element-manipulation/chat/message/types';
import { HookEvents } from 'bigbluebutton-html-plugin-sdk/dist/cjs/core/enum';
import { UpdatedEventDetails } from 'bigbluebutton-html-plugin-sdk/dist/cjs/core/types';
import { DomElementManipulationHooks } from 'bigbluebutton-html-plugin-sdk/dist/cjs/dom-element-manipulation/enums';
import {
  CHAT_MESSAGE_PUBLIC_SUBSCRIPTION,
  CHAT_MESSAGE_PRIVATE_SUBSCRIPTION,
} from './queries';
import { Message } from '/imports/ui/Types/message';
import ChatMessage from './chat-message/component';
import { GraphqlDataHookSubscriptionResponse } from '/imports/ui/Types/hook';
import { useCreateUseSubscription } from '/imports/ui/core/hooks/createUseSubscription';
import { setLoadedMessageGathering } from '/imports/ui/core/hooks/useLoadedChatMessages';
import { ChatLoading } from '../../component';

interface ChatListPageContainerProps {
  page: number;
  pageSize: number;
  setLastSender: (page: number, message: string) => void;
  lastSenderPreviousPage: string | undefined;
  // eslint-disable-next-line react/no-unused-prop-types
  lastSeenAt: string,
  chatId: string;
  markMessageAsSeen: (message: Message) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

interface ChatListPageProps {
  messages: Array<Message>;
  lastSenderPreviousPage: string | undefined;
  page: number;
  markMessageAsSeen: (message: Message)=> void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const ChatListPage: React.FC<ChatListPageProps> = ({
  messages,
  lastSenderPreviousPage,
  page,
  markMessageAsSeen,
  scrollRef,
}) => {
  const { domElementManipulationMessageIds } = useContext(PluginsContext);
  const [messagesRequestedFromPlugin, setMessagesRequestedFromPlugin] = useState<
  UpdatedEventDetailsForChatMessageDomElements[]>([]);
  useEffect(() => {
    const dataToSend = messagesRequestedFromPlugin.filter((
      message,
    ) => domElementManipulationMessageIds.indexOf(message.messageId) !== -1);
    window.dispatchEvent(
      new CustomEvent<UpdatedEventDetails<UpdatedEventDetailsForChatMessageDomElements[]>>(HookEvents.UPDATED, {
        detail: {
          hook: DomElementManipulationHooks.CHAT_MESSAGE,
          data: dataToSend,
        },
      }),
    );
  }, [domElementManipulationMessageIds]);
  return (
    // eslint-disable-next-line react/jsx-filename-extension
    <div key={`messagePage-${page}`} id={`${page}`}>
      {messages.map((message, index, messagesArray) => {
        const previousMessage = messagesArray[index - 1];
        return (
          <ChatMessage
            key={message.createdAt}
            message={message}
            previousMessage={previousMessage}
            setMessagesRequestedFromPlugin={setMessagesRequestedFromPlugin}
            lastSenderPreviousPage={
              !previousMessage ? lastSenderPreviousPage : null
            }
            scrollRef={scrollRef}
            markMessageAsSeen={markMessageAsSeen}
          />
        );
      })}
    </div>
  );
};

const ChatListPageContainer: React.FC<ChatListPageContainerProps> = ({
  page,
  pageSize,
  setLastSender,
  lastSenderPreviousPage,
  chatId,
  markMessageAsSeen,
  scrollRef,
}) => {
  // @ts-ignore - temporary, while meteor exists in the project
  const CHAT_CONFIG = window.meetingClientSettings.public.chat;
  const PUBLIC_GROUP_CHAT_KEY = CHAT_CONFIG.public_group_id;

  const isPublicChat = chatId === PUBLIC_GROUP_CHAT_KEY;
  const chatQuery = isPublicChat
    ? CHAT_MESSAGE_PUBLIC_SUBSCRIPTION
    : CHAT_MESSAGE_PRIVATE_SUBSCRIPTION;
  const defaultVariables = { offset: (page) * pageSize, limit: pageSize };
  const variables = isPublicChat
    ? defaultVariables : { ...defaultVariables, requestedChatId: chatId };

  const useChatMessageSubscription = useCreateUseSubscription<Message>(chatQuery, variables, true);
  const {
    data: chatMessageData,
  } = useChatMessageSubscription((msg) => msg) as GraphqlDataHookSubscriptionResponse<Message[]>;

  useEffect(() => {
    // component will unmount
    return () => {
      setLoadedMessageGathering(page, []);
    };
  }, []);

  if (!chatMessageData) return null;
  if (chatMessageData.length > 0 && chatId !== chatMessageData[0].chatId) return <ChatLoading isRTL={document.dir === 'rtl'} />;
  if (chatMessageData.length > 0 && chatMessageData[chatMessageData.length - 1].user?.userId) {
    setLastSender(page, chatMessageData[chatMessageData.length - 1].user?.userId);
  }
  setLoadedMessageGathering(page, chatMessageData);
  return (
    <ChatListPage
      messages={chatMessageData}
      lastSenderPreviousPage={lastSenderPreviousPage}
      page={page}
      markMessageAsSeen={markMessageAsSeen}
      scrollRef={scrollRef}
    />
  );
};

export default ChatListPageContainer;
