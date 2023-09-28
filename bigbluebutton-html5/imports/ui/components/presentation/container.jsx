import React, { useContext } from 'react';
import { notify } from '/imports/ui/services/notification';
import Presentation from '/imports/ui/components/presentation/component';
import PresentationToolbarService from './presentation-toolbar/service';
import { UsersContext } from '../components-data/users-context/context';
import Auth from '/imports/ui/services/auth';
import getFromUserSettings from '/imports/ui/services/users-settings';
import {
  layoutSelect,
  layoutSelectInput,
  layoutSelectOutput,
  layoutDispatch,
} from '../layout/context';
import WhiteboardService from '/imports/ui/components/whiteboard/service';
import { DEVICE_TYPE } from '../layout/enums';
import MediaService from '../media/service';
import { useSubscription } from '@apollo/client';
import {
  CURRENT_PRESENTATION_PAGE_SUBSCRIPTION,
} from '/imports/ui/components/whiteboard/queries';
import POLL_SUBSCRIPTION from '/imports/ui/core/graphql/queries/pollSubscription';

const APP_CONFIG = Meteor.settings.public.app;

const PRELOAD_NEXT_SLIDE = APP_CONFIG.preloadNextSlides;
const fetchedpresentation = {};

const PresentationContainer = (props) => {
  const { data: presentationPageData } = useSubscription(CURRENT_PRESENTATION_PAGE_SUBSCRIPTION);
  const { pres_page_curr: presentationPageArray } = (presentationPageData || {});
  const currentPresentationPage = presentationPageArray && presentationPageArray[0];
  const presentationId = currentPresentationPage?.presentationId;

  const { data: pollData } = useSubscription(POLL_SUBSCRIPTION);
  const poll = pollData?.poll[0] || {};

  if (currentPresentationPage) {
    if (PRELOAD_NEXT_SLIDE && !fetchedpresentation[presentationId]) {
      fetchedpresentation[presentationId] = {
        canFetch: true,
        fetchedSlide: {},
      };
    }
    const currentSlideNum = currentPresentationPage.num;
    const presentation = fetchedpresentation[presentationId];

    if (PRELOAD_NEXT_SLIDE
      && !presentation.fetchedSlide[currentSlideNum + PRELOAD_NEXT_SLIDE]
      && presentation.canFetch) {
      // TODO: preload next slides should be reimplemented in graphql
      const slidesToFetch = [currentPresentationPage];

      const promiseImageGet = slidesToFetch
        .filter((s) => !fetchedpresentation[presentationId].fetchedSlide[s.num])
        .map(async (slide) => {
          const slideUrls = JSON.parse(slide.urls);
          if (presentation.canFetch) presentation.canFetch = false;
          const image = await fetch(slideUrls.svg);
          if (image.ok) {
            presentation.fetchedSlide[slide.num] = true;
          }
        });
      Promise.all(promiseImageGet).then(() => {
        presentation.canFetch = true;
      });
    }
  }

  const cameraDock = layoutSelectInput((i) => i.cameraDock);
  const presentation = layoutSelectOutput((i) => i.presentation);
  const fullscreen = layoutSelect((i) => i.fullscreen);
  const deviceType = layoutSelect((i) => i.deviceType);
  const layoutContextDispatch = layoutDispatch();

  const { numCameras } = cameraDock;
  const { element } = fullscreen;
  const fullscreenElementId = 'Presentation';
  const fullscreenContext = (element === fullscreenElementId);

  const isIphone = !!(navigator.userAgent.match(/iPhone/i));

  const usingUsersContext = useContext(UsersContext);
  const { users } = usingUsersContext;
  const currentUser = users[Auth.meetingID][Auth.userID];
  const userIsPresenter = currentUser.presenter;
  const { presentationIsOpen } = props;

  return (
    <Presentation
      {
      ...{
        currentSlide: currentPresentationPage,
        downloadPresentationUri: '', // TODO: add to graphql
        multiUser: // TODO: check if this is still needed
          (WhiteboardService.hasMultiUserAccess(currentPresentationPage && currentPresentationPage.slideId, Auth.userID)
            || WhiteboardService.isMultiUserActive(currentPresentationPage?.slideId)
          ) && presentationIsOpen,
        presentationIsDownloadable: false, // TODO: add to graphql
        mountPresentation: !!currentPresentationPage,
        currentPresentationId: presentationId,
        numPages: 200, // TODO: add to graphql
        notify,
        zoomSlide: PresentationToolbarService.zoomSlide,
        publishedPoll: poll?.published || false,
        restoreOnUpdate: getFromUserSettings(
          'bbb_force_restore_presentation_on_new_events',
          Meteor.settings.public.presentation.restoreOnUpdate,
        ),
        addWhiteboardGlobalAccess: WhiteboardService.addGlobalAccess,
        removeWhiteboardGlobalAccess: WhiteboardService.removeGlobalAccess,
        multiUserSize: WhiteboardService.getMultiUserSize(currentPresentationPage?.slideId), //TODO: check if this is still needed
        setPresentationIsOpen: MediaService.setPresentationIsOpen,
        layoutContextDispatch,
        numCameras,
        ...props,
        userIsPresenter,
        presentationBounds: presentation,
        fullscreenContext,
        fullscreenElementId,
        isMobile: deviceType === DEVICE_TYPE.MOBILE,
        isIphone,
        presentationIsOpen,
      }
      }
    />
  );
};

export default PresentationContainer;
