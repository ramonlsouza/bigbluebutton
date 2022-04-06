import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Notifications as NotificationsCollection } from '/imports/api/meetings';
import { notify } from '/imports/ui/services/notification';
import { withTracker } from 'meteor/react-meteor-data';
import WaitingUsersAlertService from '/imports/ui/components/waiting-users/alert/service';
import UserService from '/imports/ui/components/user-list/service';

export default withTracker(() => {
  NotificationsCollection.find({}).observe({
    added: (obj) => {
      if (obj.messageId === 'app.userList.guest.pendingGuestAlert') {
        return WaitingUsersAlertService.alert(obj);
      }

      if (obj.messageId === 'app.notification.userJoinPushAlert') {
        return UserService.UserJoinedMeetingAlert(obj);
      }

      if (obj.messageId === 'app.notification.userLeavePushAlert') {
        return UserService.UserLeftMeetingAlert(obj);
      }

      notify(
        <FormattedMessage
          id={obj.messageId}
          values={obj.messageValues}
          description={obj.messageDescription}
        />,
        obj.notificationType,
        obj.icon,
      );
    },
  });
  return {};
})(() => null);
