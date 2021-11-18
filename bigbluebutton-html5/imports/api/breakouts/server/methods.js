import { Meteor } from 'meteor/meteor';
import createBreakoutRoom from '/imports/api/breakouts/server/methods/createBreakout';
import requestJoinURL from './methods/requestJoinURL';
import endAllBreakouts from './methods/endAllBreakouts';
import extendBreakoutsTime from './methods/extendBreakoutsTime';
import getParentMeeting from "./methods/getParentMeeting";

Meteor.methods({
  requestJoinURL,
  createBreakoutRoom,
  endAllBreakouts,
  extendBreakoutsTime,
  getParentMeeting,
});
