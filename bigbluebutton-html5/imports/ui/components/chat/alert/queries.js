import { gql } from '@apollo/client';

const UNREAD_CHATS_SUBSCRIPTION = gql`
  subscription {
    chat(
      order_by: [
        { public: desc }
        { totalUnread: desc }
        { participant: { name: asc, userId: asc } }
      ]
      where: { totalUnread: { _gt: 0 } }
    ) {
      chatId
      participant {
        userId
        name
        role
        color
        loggedOut
        avatar
        isOnline
        isModerator
      }
      totalMessages
      totalUnread
      public
      lastSeenAt
    }
  }
`;

export default UNREAD_CHATS_SUBSCRIPTION;
