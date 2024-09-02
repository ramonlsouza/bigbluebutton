package org.bigbluebutton.core.apps.users

import org.bigbluebutton.LockSettingsUtil
import org.bigbluebutton.common2.msgs._
import org.bigbluebutton.core.models.{ Users2x, VoiceUsers }
import org.bigbluebutton.core.running.{ MeetingActor, OutMsgRouter }
import org.bigbluebutton.core.apps.{ PermissionCheck, RightsManagementTrait }

trait LockUserChatInMeetingCmdMsgHdlr extends RightsManagementTrait {
  this: MeetingActor =>

  val outGW: OutMsgRouter

  def handleLockUserChatInMeetingCmdMsg(msg: LockUserChatInMeetingCmdMsg) {
    def build(meetingId: String, userId: String, isChatLocked: Boolean): BbbCommonEnvCoreMsg = {
      val routing = Routing.addMsgToClientRouting(MessageTypes.BROADCAST_TO_MEETING, meetingId, userId)
      val envelope = BbbCoreEnvelope(LockUserChatInMeetingEvtMsg.NAME, routing)
      val body = LockUserChatInMeetingEvtMsgBody(userId, isChatLocked)
      val header = BbbClientMsgHeader(LockUserChatInMeetingEvtMsg.NAME, meetingId, userId)
      val event = LockUserChatInMeetingEvtMsg(header, body)

      BbbCommonEnvCoreMsg(envelope, event)
    }

    if (permissionFailed(PermissionCheck.MOD_LEVEL, PermissionCheck.VIEWER_LEVEL, liveMeeting.users2x, msg.header.userId)) {
      val meetingId = liveMeeting.props.meetingProp.intId
      val reason = "No permission to lock user chat in meeting."
      PermissionCheck.ejectUserForFailedPermission(meetingId, msg.header.userId, reason, outGW, liveMeeting)
    } else {
      for {
        uvo <- Users2x.setUserChatLocked(liveMeeting.users2x, msg.header.userId, msg.body.isChatLocked)
      } yield {
        log.info("Lock user chat. meetingId=" + props.meetingProp.intId + " userId=" + msg.body.userId + " isChatLocked=" + msg.body.isChatLocked)
        val event = build(props.meetingProp.intId, msg.body.userId, msg.body.isChatLocked)
        outGW.send(event)
      }
    }
  }
}
