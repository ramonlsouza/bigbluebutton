import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import {
  addGlobalAccess,
  removeGlobalAccess,
  isMultiUserActive,
  getMultiUserSize,
} from '/imports/ui/components/whiteboard/service';
import WhiteboardToolbarService from './service';
import WhiteboardToolbar from './component';

const WhiteboardToolbarContainer = props => (
  <WhiteboardToolbar {...props} />
);

export default withTracker((params) => {
  const { whiteboardId } = params;

  const data = {
    actions: {
      undoAnnotation: WhiteboardToolbarService.undoAnnotation,
      clearWhiteboard: WhiteboardToolbarService.clearWhiteboard,
      addWhiteboardGlobalAccess: addGlobalAccess,
      removeWhiteboardGlobalAccess: removeGlobalAccess,
      changeWhiteboardMode: WhiteboardToolbarService.changeWhiteboardMode,
      getCurrentPalmRejectionMode: WhiteboardToolbarService.getCurrentPalmRejectionMode,
      setInitialPalmRejectionMode: WhiteboardToolbarService.setInitialPalmRejectionMode,
      setPalmRejectionMode: WhiteboardToolbarService.setPalmRejectionMode,
      setInitialWhiteboardToolbarValues: WhiteboardToolbarService.setInitialWhiteboardToolbarValues,
      getCurrentDrawSettings: WhiteboardToolbarService.getCurrentDrawSettings,
      setFontSize: WhiteboardToolbarService.setFontSize,
      setTool: WhiteboardToolbarService.setTool,
      setThickness: WhiteboardToolbarService.setThickness,
      setColor: WhiteboardToolbarService.setColor,
      setTextShapeObject: WhiteboardToolbarService.setTextShapeObject,
    },
    textShapeActiveId: WhiteboardToolbarService.getTextShapeActiveId(),
    multiUser: isMultiUserActive(whiteboardId),
    isPresenter: WhiteboardToolbarService.isPresenter(),
    annotations: WhiteboardToolbarService.filterAnnotationList(),
    isMeteorConnected: Meteor.status().connected,
    multiUserSize: getMultiUserSize(whiteboardId),
  };

  return data;
})(WhiteboardToolbarContainer);
