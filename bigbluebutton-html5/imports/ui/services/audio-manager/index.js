import { Tracker } from 'meteor/tracker';
import KurentoBridge from '/imports/api/audio/client/bridge/kurento';

import Auth from '/imports/ui/services/auth';
import VoiceUsers from '/imports/api/voice-users';
import Meetings from '/imports/api/meetings';
import Meeting from '/imports/ui/services/meeting';
import breakoutService from '/imports/ui/components/breakout-room/service'
import SIPBridge from '/imports/api/audio/client/bridge/sip';
import logger from '/imports/startup/client/logger';
import { notify } from '/imports/ui/services/notification';
import playAndRetry from '/imports/utils/mediaElementPlayRetry';
import iosWebviewAudioPolyfills from '/imports/utils/ios-webview-audio-polyfills';
import { monitorAudioConnection } from '/imports/utils/stats';
import AudioErrors from './error-codes';
import {Meteor} from "meteor/meteor";
import browserInfo from '/imports/utils/browserInfo';
import getFromMeetingSettings from '/imports/ui/services/meeting-settings';
import { BehaviorSubject } from "rxjs";
import Service from "../../components/actions-bar/service";

const STATS = Meteor.settings.public.stats;
const MEDIA = Meteor.settings.public.media;
const MEDIA_TAG = MEDIA.mediaTag;
const ECHO_TEST_NUMBER = MEDIA.echoTestNumber;
const MAX_LISTEN_ONLY_RETRIES = 1;
const LISTEN_ONLY_CALL_TIMEOUT_MS = MEDIA.listenOnlyCallTimeout || 25000;
const DEFAULT_INPUT_DEVICE_ID = 'default';
const DEFAULT_OUTPUT_DEVICE_ID = 'default';
const EXPERIMENTAL_USE_KMS_TRICKLE_ICE_FOR_MICROPHONE = Meteor.settings
  .public.app.experimentalUseKmsTrickleIceForMicrophone;
const TRANSLATOR_SPEECH_DETECTION_THRESHOLD = MEDIA.translation.translator.speakDetection.threshold || -70;
const TRANSLATION_SETTINGS = Meteor.settings.public.media.translation || {};

const DEFAULT_AUDIO_BRIDGES_PATH = '/imports/api/audio/client/';
const CALL_STATES = {
  STARTED: 'started',
  ENDED: 'ended',
  FAILED: 'failed',
  RECONNECTING: 'reconnecting',
  AUTOPLAY_BLOCKED: 'autoplayBlocked',
};

const BREAKOUT_AUDIO_TRANSFER_STATES = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RETURNING: 'returning',
};

/**
 * Audio status to be filtered in getStats()
 */
const FILTER_AUDIO_STATS = [
  'outbound-rtp',
  'inbound-rtp',
  'candidate-pair',
  'local-candidate',
  'transport',
];

export const ORIGINAL_TRANSLATION = 'original';

class AudioManager {
  constructor() {
    this._inputDevice = {
      value: DEFAULT_INPUT_DEVICE_ID,
      tracker: new Tracker.Dependency(),
    };

    this._breakoutAudioTransferStatus = {
      status: BREAKOUT_AUDIO_TRANSFER_STATES.DISCONNECTED,
      breakoutMeetingId: null,
    };

    this.setSenderTrackSettings = {
      maxTries: 3,
      base: 0,
      inc: 500,
      i: 0
    };


    this.translatorStream = null;
    this.translatorSpeechEvents = null;

    // this shows whether the user wants to be muted, regardless of the channel they have chosen
    this.$muteIntended = new BehaviorSubject(false);

    this.$translatorSpeechDetectionThresholdChanged = new BehaviorSubject(TRANSLATOR_SPEECH_DETECTION_THRESHOLD);
    this.$translationChannelSelected= new BehaviorSubject(-1);
    this.$translatorSpeakingChanged = new BehaviorSubject(false);
    this.$translatorChannelLanguageExtensionChanged = new BehaviorSubject(-1);

    this.$translationOriginalVolumeChanged = new BehaviorSubject({ extension: -1, volume: 0 });
    this.translationOriginalVolume = [];

    this.defineProperties({
      isMuted: false,
      isConnected: false,
      isConnecting: false,
      isHangingUp: false,
      isListenOnly: false,
      isEchoTest: false,
      isTalking: false,
      isWaitingPermissions: false,
      error: null,
      muteHandle: null,
      autoplayBlocked: false,
      isReconnecting: false,
      listeningTranslation: ORIGINAL_TRANSLATION,
      translatorChannelOpen:false,
      translationChannelOpen:false,
    });

    this.useKurento = Meteor.settings.public.kurento.enableListenOnly;
    this.failedMediaElements = [];
    this.handlePlayElementFailed = this.handlePlayElementFailed.bind(this);
    this.monitor = this.monitor.bind(this);

    this._inputStream = null;
    this._inputStreamTracker = new Tracker.Dependency();

    this.BREAKOUT_AUDIO_TRANSFER_STATES = BREAKOUT_AUDIO_TRANSFER_STATES;

    // this.muteHandles = new Set();
    this.$translatorMuted = new BehaviorSubject(true);
    this.$translatorMuted.subscribe((val) => {
      this.setSenderTrackEnabledTranslator(!val);
    })

    this.muteStateCallbacks = new Set();
    this.translationStateCallbacks = new Set();
    this.translationState = null;
    this.$translatorSpeechDetectionThresholdChanged.subscribe((val) => {
      if(this.translatorSpeechEvents && this.translatorSpeechEvents.hasOwnProperty("setThreshold")) {
        this.translatorSpeechEvents.setThreshold(val);
      }
    });

    this.$translationOriginalVolumeChanged.subscribe((pLang) => {
        if(
            pLang.hasOwnProperty("extension") &&
            pLang.hasOwnProperty("volume")
        ) {
          this.translationOriginalVolume[pLang.extension] = pLang.volume;
          this.setTranslationFloorVolumeByExt(pLang.extension);
        }
    })
  }

  async init(userData, audioEventHandler) {
    this.translationBridge = new SIPBridge({...userData}, "#translation-media");
    this.translatorBridge = new SIPBridge({...userData},
        "#translator-media",
        {
          video: false,
          audio: {
            echoCancellation: false,
          },
        },
    );
    this.userData = userData;
    this.initialized = true;
    this.audioEventHandler = audioEventHandler;
    await this.loadBridges(userData);
  }

  /**
   * Load audio bridges modules to be used the manager.
   *
   * Bridges can be configured in settings.yml file.
   * @param {Object} userData The Object representing user data to be passed to
   *                      the bridge.
   */
  async loadBridges(userData) {
    let FullAudioBridge = SIPBridge;
    let ListenOnlyBridge = KurentoBridge;

    if (MEDIA.audio) {
      const {
        bridges,
        defaultFullAudioBridge,
        defaultListenOnlyBridge,
      } = MEDIA.audio;

      const _fullAudioBridge = getFromMeetingSettings(
        'fullaudio-bridge',
        defaultFullAudioBridge,
      );

      this.bridges = {};

      await Promise.all(Object.values(bridges).map(async (bridge) => {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        this.bridges[bridge.name] = (await import(DEFAULT_AUDIO_BRIDGES_PATH
          + bridge.path) || {}).default;
      }));

      if (_fullAudioBridge && (this.bridges[_fullAudioBridge])) {
        FullAudioBridge = this.bridges[_fullAudioBridge];
      }

      if (defaultListenOnlyBridge && (this.bridges[defaultListenOnlyBridge])) {
        ListenOnlyBridge = this.bridges[defaultListenOnlyBridge];
      }
    }

    this.bridge = new FullAudioBridge(userData);
    if (this.useKurento) {
      this.listenOnlyBridge = new ListenOnlyBridge(userData);
    }
  }

  setAudioMessages(messages, intl) {
    this.messages = messages;
    this.intl = intl;
  }

  defineProperties(obj) {
    Object.keys(obj).forEach((key) => {
      const privateKey = `_${key}`;
      this[privateKey] = {
        value: obj[key],
        tracker: new Tracker.Dependency(),
      };

      Object.defineProperty(this, key, {
        set: (value) => {
          this[privateKey].value = value;
          this[privateKey].tracker.changed();
        },
        get: () => {
          this[privateKey].tracker.depend();
          return this[privateKey].value;
        },
      });
    });
  }

  async trickleIce() {
    const { isFirefox, isIe, isSafari } = browserInfo;

    if (!this.listenOnlyBridge
      || isFirefox
      || isIe
      || isSafari) return [];

    if (this.validIceCandidates && this.validIceCandidates.length) {
      logger.info({ logCode: 'audiomanager_trickle_ice_reuse_candidate' },
        'Reusing trickle-ice information before activating microphone');
      return this.validIceCandidates;
    }

    logger.info({ logCode: 'audiomanager_trickle_ice_get_local_candidate' },
      'Performing trickle-ice before activating microphone');
    this.validIceCandidates = await this.listenOnlyBridge.trickleIce() || [];
    return this.validIceCandidates;
  }

  joinMicrophone() {
    this.audioJoinStartTime = new Date();
    this.logAudioJoinTime = false;
    this.isListenOnly = false;
    this.isEchoTest = false;

    return this.onAudioJoining.bind(this)()
      .then(() => {
        const callOptions = {
          isListenOnly: false,
          extension: null,
          inputStream: this.inputStream,
        };
        return this.joinAudio(callOptions, this.callStateCallback.bind(this));
      });
  }

  joinEchoTest() {
    this.audioJoinStartTime = new Date();
    this.logAudioJoinTime = false;
    this.isListenOnly = false;
    this.isEchoTest = true;

    return this.onAudioJoining.bind(this)()
      .then(async () => {
        let validIceCandidates = [];
        if (EXPERIMENTAL_USE_KMS_TRICKLE_ICE_FOR_MICROPHONE) {
          validIceCandidates = await this.trickleIce();
        }

        const callOptions = {
          isListenOnly: false,
          extension: ECHO_TEST_NUMBER,
          inputStream: this.inputStream,
          validIceCandidates,
        };
        logger.info({ logCode: 'audiomanager_join_echotest', extraInfo: { logType: 'user_action' } }, 'User requested to join audio conference with mic');
        return this.joinAudio(callOptions, this.callStateCallback.bind(this));
      });
  }

  joinAudio(callOptions, callStateCallback) {
    return this.bridge.joinAudio(callOptions,
      callStateCallback.bind(this)).catch((error) => {
      const { name } = error;

      if (!name) {
        throw error;
      }

      switch (name) {
        case 'NotAllowedError':
          logger.error({
            logCode: 'audiomanager_error_getting_device',
            extraInfo: {
              errorName: error.name,
              errorMessage: error.message,
            },
          }, `Error getting microphone - {${error.name}: ${error.message}}`);
          break;
        case 'NotFoundError':
          logger.error({
            logCode: 'audiomanager_error_device_not_found',
            extraInfo: {
              errorName: error.name,
              errorMessage: error.message,
            },
          }, `Error getting microphone - {${error.name}: ${error.message}}`);
          break;

        default:
          break;
      }

      this.isConnecting = false;
      this.isWaitingPermissions = false;

      throw {
        type: 'MEDIA_ERROR',
      };
    });
  }

  async joinListenOnly(r = 0) {
    this.audioJoinStartTime = new Date();
    this.logAudioJoinTime = false;
    let retries = r;
    this.isListenOnly = true;
    this.isEchoTest = false;

    // The kurento bridge isn't a full audio bridge yet, so we have to differ it
    const bridge = this.useKurento ? this.listenOnlyBridge : this.bridge;

    const callOptions = {
      isListenOnly: true,
      extension: null,
    };

    // Call polyfills for webrtc client if navigator is "iOS Webview"
    const userAgent = window.navigator.userAgent.toLocaleLowerCase();
    if ((userAgent.indexOf('iphone') > -1 || userAgent.indexOf('ipad') > -1)
       && userAgent.indexOf('safari') === -1) {
      iosWebviewAudioPolyfills();
    }

    // We need this until we upgrade to SIP 9x. See #4690
    const listenOnlyCallTimeoutErr = this.useKurento ? 'KURENTO_CALL_TIMEOUT' : 'SIP_CALL_TIMEOUT';

    const iceGatheringTimeout = new Promise((resolve, reject) => {
      setTimeout(reject, LISTEN_ONLY_CALL_TIMEOUT_MS, listenOnlyCallTimeoutErr);
    });

    const exitKurentoAudio = () => {
      if (this.useKurento) {
        bridge.exitAudio();
        const audio = document.querySelector(MEDIA_TAG);
        audio.muted = false;
      }
    };

    const handleListenOnlyError = (err) => {
      if (iceGatheringTimeout) {
        clearTimeout(iceGatheringTimeout);
      }

      const errorReason = (typeof err === 'string' ? err : undefined) || err.errorReason || err.errorMessage;
      const bridgeInUse = (this.useKurento ? 'Kurento' : 'SIP');

      logger.error({
        logCode: 'audiomanager_listenonly_error',
        extraInfo: {
          errorReason,
          audioBridge: bridgeInUse,
          retries,
        },
      }, `Listen only error - ${errorReason} - bridge: ${bridgeInUse}`);
    };

    logger.info({ logCode: 'audiomanager_join_listenonly', extraInfo: { logType: 'user_action' } }, 'user requested to connect to audio conference as listen only');

    window.addEventListener('audioPlayFailed', this.handlePlayElementFailed);

    return this.onAudioJoining()
      .then(() => Promise.race([
        bridge.joinAudio(callOptions, this.callStateCallback.bind(this)),
        iceGatheringTimeout,
      ]))
      .catch(async (err) => {
        handleListenOnlyError(err);

        if (retries < MAX_LISTEN_ONLY_RETRIES) {
          // Fallback to SIP.js listen only in case of failure
          if (this.useKurento) {
            exitKurentoAudio();

            this.useKurento = false;

            const errorReason = (typeof err === 'string' ? err : undefined) || err.errorReason || err.errorMessage;

            logger.info({
              logCode: 'audiomanager_listenonly_fallback',
              extraInfo: {
                logType: 'fallback',
                errorReason,
              },
            }, `Falling back to FreeSWITCH listenOnly - cause: ${errorReason}`);
          }

          retries += 1;
          this.joinListenOnly(retries);
        }

        return null;
      });
  }

  onAudioJoining() {
    this.isConnecting = true;
    this.isMuted = false;
    this.error = false;

    return Promise.resolve();
  }

  exitTranslationBridgeAudio() {
    if(this.translationBridge && this.translationBridge.activeSession ) {
      this.translationBridge.exitAudio();
    }
  }

  exitAudio() {
    if (!this.isConnected) return Promise.resolve();

    const bridge = (this.useKurento && this.isListenOnly) ? this.listenOnlyBridge : this.bridge;

    this.isHangingUp = true;

    this.exitTranslationBridgeAudio();
    if(bridge) return bridge.exitAudio();
  }

  transferCall() {
    this.onTransferStart();
    if(this.bridge) return this.bridge.transferCall(this.onAudioJoin.bind(this));
  }

  onVoiceUserChanges(fields) {
    if (fields.muted !== undefined && fields.muted !== this.isMuted) {
      let muteState;
      this.isMuted = fields.muted;

      if (this.isMuted) {
        muteState = 'selfMuted';
        this.mute();
      } else {
        muteState = 'selfUnmuted';
        this.unmute();
      }

      window.parent.postMessage({ response: muteState }, '*');
    }

    if (fields.talking !== undefined && fields.talking !== this.isTalking) {
      this.isTalking = fields.talking;
    }

    if (this.isMuted) {
      this.isTalking = false;
    }
  }

  onAudioJoin() {
    this.isConnecting = false;
    this.isConnected = true;

    // listen to the VoiceUsers changes and update the flag
    if (!this.muteHandle) {
      const query = VoiceUsers.find({ intId: Auth.userID }, { fields: { muted: 1, talking: 1 } });
      this.muteHandle = query.observeChanges({
        added: (id, fields) => this.onVoiceUserChanges(fields),
        changed: (id, fields) => this.onVoiceUserChanges(fields),
      });
    }
    const secondsToActivateAudio = (new Date() - this.audioJoinStartTime) / 1000;

    if (!this.logAudioJoinTime) {
      this.logAudioJoinTime = true;
      logger.info({
        logCode: 'audio_mic_join_time',
        extraInfo: {
          secondsToActivateAudio,
        },
      }, `Time needed to connect audio (seconds): ${secondsToActivateAudio}`);
    }

    if (!this.isEchoTest) {
      window.parent.postMessage({ response: 'joinedAudio' }, '*');
      this.notify(this.intl.formatMessage(this.messages.info.JOINED_AUDIO));
      logger.info({ logCode: 'audio_joined' }, 'Audio Joined');
      this.inputStream = (this.bridge ? this.bridge.inputStream : null);
      if (STATS.enabled) this.monitor();
      this.audioEventHandler({
        name: 'started',
        isListenOnly: this.isListenOnly,
      });
    }
    Session.set('audioModalIsOpen', false);
  }

  onTransferStart() {
    this.isEchoTest = false;
    this.isConnecting = true;
  }

  onAudioExit() {
    this.isConnected = false;
    this.isConnecting = false;
    this.isHangingUp = false;
    this.autoplayBlocked = false;
    this.failedMediaElements = [];

    if (this.inputStream) {
      this.inputStream.getTracks().forEach((track) => track.stop());
      this.inputStream = null;
      this.inputDevice = { id: 'default' };
    }

    if (!this.error && !this.isEchoTest) {
      this.notify(
        this.intl.formatMessage(this.messages.info.LEFT_AUDIO),
        false,
        'no_audio'
      );
    }
    if (!this.isEchoTest) {
      this.playHangUpSound();
    }

    window.parent.postMessage({ response: 'notInAudio' }, '*');
    window.removeEventListener('audioPlayFailed', this.handlePlayElementFailed);
  }

  callStateCallback(response) {
    return new Promise((resolve) => {
      const {
        STARTED,
        ENDED,
        FAILED,
        RECONNECTING,
        AUTOPLAY_BLOCKED,
      } = CALL_STATES;

      const {
        status,
        error,
        bridgeError,
        silenceNotifications,
        bridge,
      } = response;

      if (status === STARTED) {
        this.isReconnecting = false;
        this.onAudioJoin();
        resolve(STARTED);
      } else if (status === ENDED) {
        this.isReconnecting = false;
        this.setBreakoutAudioTransferStatus({
          breakoutMeetingId: '',
          status: BREAKOUT_AUDIO_TRANSFER_STATES.DISCONNECTED,
        });
        logger.info({ logCode: 'audio_ended' }, 'Audio ended without issue');
        this.onAudioExit();
      } else if (status === FAILED) {
        this.isReconnecting = false;
        this.setBreakoutAudioTransferStatus({
          breakoutMeetingId: '',
          status: BREAKOUT_AUDIO_TRANSFER_STATES.DISCONNECTED,
        })
        const errorKey = this.messages.error[error] || this.messages.error.GENERIC_ERROR;
        const errorMsg = this.intl.formatMessage(errorKey, { 0: bridgeError });
        this.error = !!error;
        logger.error({
          logCode: 'audio_failure',
          extraInfo: {
            errorCode: error,
            cause: bridgeError,
            bridge,
          },
        }, `Audio error - errorCode=${error}, cause=${bridgeError}`);
        if (silenceNotifications !== true) {
          this.notify(errorMsg, true);
          this.exitAudio();
          this.onAudioExit();
        }
      } else if (status === RECONNECTING) {
        this.isReconnecting = true;
        this.setBreakoutAudioTransferStatus({
          breakoutMeetingId: '',
          status: BREAKOUT_AUDIO_TRANSFER_STATES.DISCONNECTED,
        })
        logger.info({ logCode: 'audio_reconnecting' }, 'Attempting to reconnect audio');
        this.notify(this.intl.formatMessage(this.messages.info.RECONNECTING_AUDIO), true);
        this.playHangUpSound();
      } else if (status === AUTOPLAY_BLOCKED) {
        this.setBreakoutAudioTransferStatus({
          breakoutMeetingId: '',
          status: BREAKOUT_AUDIO_TRANSFER_STATES.DISCONNECTED,
        })
        this.isReconnecting = false;
        this.autoplayBlocked = true;
        this.onAudioJoin();
        resolve(AUTOPLAY_BLOCKED);
      }
    });
  }

  isUsingAudio() {
    return this.isConnected || this.isConnecting
      || this.isHangingUp || this.isEchoTest;
  }

  setDefaultInputDevice() {
    return this.changeInputDevice();
  }

  setDefaultOutputDevice() {
    return this.changeOutputDevice('default');
  }

  changeInputDevice(deviceId) {
    if (!deviceId) {
      return Promise.resolve();
    }

    const handleChangeInputDeviceSuccess = (inputDeviceId) => {
      this.inputDevice.id = inputDeviceId;
      return Promise.resolve(inputDeviceId);
    };

    const reconnectTranslator = (inputDeviceId) => {
      if (this.translatorBridge.activeSession) {
        this.openTranslatorChannel(this.translationLanguageExtension);
      }
    };

    const handleChangeInputDeviceError = (error) => {
      logger.error({
        logCode: 'audiomanager_error_getting_device',
        extraInfo: {
          errorName: error.name,
          errorMessage: error.message,
        },
      }, `Error getting microphone - {${error.name}: ${error.message}}`);

      const { MIC_ERROR } = AudioErrors;
      const disabledSysSetting = error.message.includes('Permission denied by system');
      const isMac = navigator.platform.indexOf('Mac') !== -1;

      let code = MIC_ERROR.NO_PERMISSION;
      if (isMac && disabledSysSetting) code = MIC_ERROR.MAC_OS_BLOCK;

      return Promise.reject({
        type: 'MEDIA_ERROR',
        message: this.messages.error.MEDIA_ERROR,
        code,
      });
    };

    return Promise.all(
        [
          this.bridge.changeInputDeviceId(deviceId)
              .then(handleChangeInputDeviceSuccess)
              .catch(handleChangeInputDeviceError),
          this.translatorBridge.changeInputDeviceId(deviceId)
              .then(handleChangeInputDeviceSuccess)
              .then(reconnectTranslator.bind(this))
              .catch(handleChangeInputDeviceError),
        ]
    );
  }

  liveChangeInputDevice(deviceId) {
    // we force stream to be null, so MutedAlert will deallocate it and
    // a new one will be created for the new stream
    this.inputStream = null;
    if(this.bridge) {
      this.bridge.liveChangeInputDevice(deviceId).then((stream) => {
        this.setSenderTrackEnabled(!this.isMuted);
        this.inputStream = stream;
      });
    }
  }

  async changeOutputDevice(deviceId, isLive) {
    if(this.bridge) {
      await this
        .bridge
        .changeOutputDevice(deviceId || DEFAULT_OUTPUT_DEVICE_ID, isLive);
    }
  }

  set inputDevice(value) {
    this._inputDevice.value = value;
    this._inputDevice.tracker.changed();
  }

  get inputStream() {
    this._inputStreamTracker.depend();
    return this._inputStream;
  }

  set inputStream(stream) {
    // We store reactive information about input stream
    // because mutedalert component needs to track when it changes
    // and then update hark with the new value for inputStream
    if (this._inputStream !== stream) {
      this._inputStreamTracker.changed();
    }

    this._inputStream = stream;
  }

  get inputDevice() {
    return this._inputDevice;
  }

  get inputDeviceId() {
    return (this.bridge && this.bridge.inputDeviceId)
      ? this.bridge.inputDeviceId : DEFAULT_INPUT_DEVICE_ID;
  }

  get outputDeviceId() {
    return (this.bridge && this.bridge.outputDeviceId)
      ? this.bridge.outputDeviceId : DEFAULT_OUTPUT_DEVICE_ID;
  }

  /**
   * Sets the current status for breakout audio transfer
   * @param {Object} newStatus                  The status Object to be set for
   *                                            audio transfer.
   * @param {string} newStatus.breakoutMeetingId The meeting id of the current
   *                                            breakout audio transfer.
   * @param {string} newStatus.status           The status of the current audio
   *                                            transfer. Valid values are
   *                                            'connected', 'disconnected' and
   *                                            'returning'.
   */
  setBreakoutAudioTransferStatus(newStatus) {
    const currentStatus = this._breakoutAudioTransferStatus;
    const { breakoutMeetingId, status } = newStatus;

    if (typeof breakoutMeetingId === 'string') {
      currentStatus.breakoutMeetingId = breakoutMeetingId;
    }

    if (typeof status === 'string') {
      currentStatus.status = status;

      if (this.bridge && !this.isListenOnly) {
        if (status !== BREAKOUT_AUDIO_TRANSFER_STATES.CONNECTED) {
          this.bridge.ignoreCallState = false;
        } else {
          this.bridge.ignoreCallState = true;
        }
      }
    }
  }

  getBreakoutAudioTransferStatus() {
    return this._breakoutAudioTransferStatus;
  }

  set userData(value) {
    this._userData = value;
  }

  get userData() {
    return this._userData;
  }

  get translationLanguageExtension() {
    return this.translationBridge?.userData?.languageExtension ?? -1;
  }

  playHangUpSound() {
    this.playAlertSound(`${Meteor.settings.public.app.cdn
      + Meteor.settings.public.app.basename + Meteor.settings.public.app.instanceId}`
      + '/resources/sounds/LeftCall.mp3');
  }

  notify(message, error = false, icon = 'unmute') {
    const audioIcon = this.isListenOnly ? 'listen' : icon;

    notify(
      message,
      error ? 'error' : 'info',
      audioIcon,
    );
  }

  monitor() {
    const bridge = (this.useKurento && this.isListenOnly) ? this.listenOnlyBridge : this.bridge;
    const peer = bridge.getPeerConnection();
    monitorAudioConnection(peer);
  }

  handleAllowAutoplay() {
    window.removeEventListener('audioPlayFailed', this.handlePlayElementFailed);

    logger.info({
      logCode: 'audiomanager_autoplay_allowed',
    }, 'Listen only autoplay allowed by the user');

    while (this.failedMediaElements.length) {
      const mediaElement = this.failedMediaElements.shift();
      if (mediaElement) {
        playAndRetry(mediaElement).then((played) => {
          if (!played) {
            logger.error({
              logCode: 'audiomanager_autoplay_handling_failed',
            }, 'Listen only autoplay handling failed to play media');
          } else {
            // logCode is listenonly_* to make it consistent with the other tag play log
            logger.info({
              logCode: 'listenonly_media_play_success',
            }, 'Listen only media played successfully');
          }
        });
      }
    }
    this.autoplayBlocked = false;
  }

  handlePlayElementFailed(e) {
    const { mediaElement } = e.detail;

    e.stopPropagation();
    this.failedMediaElements.push(mediaElement);
    if (!this.autoplayBlocked) {
      logger.info({
        logCode: 'audiomanager_autoplay_prompt',
      }, 'Prompting user for action to play listen only media');
      this.autoplayBlocked = true;
    }
  }

  setSenderTrackEnabled(shouldEnable) {
    // If the bridge is set to listen only mode, nothing to do here. This method
    // is solely for muting outbound tracks.
    if (this.isListenOnly) return;

    // Bridge -> SIP.js bridge, the only full audio capable one right now
    const peer = this.bridge.getPeerConnection();

    if (!peer) {
      return;
    }

    peer.getSenders().forEach(sender => {
      const { track } = sender;
      if (track && track.kind === 'audio') {
        track.enabled = shouldEnable;
      }
    });
  }

  setSenderTrackEnabledTranslator (shouldEnable) {
    this.translatorStream && this.translatorStream.getTracks().forEach(track=>{
      if (track && track.kind === 'audio') {
        track.enabled = shouldEnable;
      }
    })
    try {
      if (this.translatorBridge && this.translatorBridge.activeSession) {
        // Bridge -> SIP.js bridge, the only full audio capable one right now
          const peer = this.translatorBridge.getPeerConnection();
          peer.getSenders().forEach(sender => {
            const {track} = sender;
            if (track && track.kind === 'audio') {
              track.enabled = shouldEnable;
              this.setSenderTrackSettings.i = 0;
              this.setSenderTrackSettings.base = 0;
            }
          });
      }
    }catch (e) {
      if(++this.setSenderTrackSettings.i === this.setSenderTrackSettings.maxTries) {
        this.setSenderTrackSettings.i = 0;
        this.setSenderTrackSettings.base = 0;
        return;
      }
      console.log("error getting peer. retrying in " + ( 0 + this.setSenderTrackSettings.base + this.setSenderTrackSettings.inc));
      setTimeout(() => {
        this.setSenderTrackEnabledTranslator(shouldEnable)
      }, this.setSenderTrackSettings.base + this.setSenderTrackSettings.inc);
      this.setSenderTrackSettings.base = this.setSenderTrackSettings.base + this.setSenderTrackSettings.inc;
    }
  }

  mute() {
    this.setSenderTrackEnabled(false);
  }

  unmute() {
    this.setSenderTrackEnabled(true);
  }

  playAlertSound(url) {
    if (!url || !this.bridge) {
      return Promise.resolve();
    }

    const audioAlert = new Audio(url);

    audioAlert.addEventListener('ended', () => { audioAlert.src = null; });


    const { outputDeviceId } = this.bridge;

    if (outputDeviceId && (typeof audioAlert.setSinkId === 'function')) {
      return audioAlert
        .setSinkId(outputDeviceId)
        .then(() => audioAlert.play());
    }

    return audioAlert.play();
  }

  async updateAudioConstraints(constraints) {
    if(this.bridge) {
      await this.bridge.updateAudioConstraints(constraints);
    }
  }

  /**
   * Helper for retrieving the current bridge being used by audio.
   * @returns An Object representing the current bridge.
   */
  getCurrentBridge() {
    return this.isListenOnly ? this.listenOnlyBridge : this.bridge;
  }

  /**
   * Get the info about candidate-pair that is being used by the current peer.
   * For firefox, or any other browser that doesn't support iceTransport
   * property of RTCDtlsTransport, we retrieve the selected local candidate
   * by looking into stats returned from getStats() api. For other browsers,
   * we should use getSelectedCandidatePairFromPeer instead, because it has
   * relatedAddress and relatedPort information about local candidate.
   *
   * @param {Object} stats object returned by getStats() api
   * @returns An Object of type RTCIceCandidatePairStats containing information
   *          about the candidate-pair being used by the peer.
   *
   * For firefox, we can use the 'selected' flag to find the candidate pair
   * being used, while in chrome we can retrieved the selected pair
   * by looking for the corresponding transport of the active peer.
   * For more information see:
   * https://www.w3.org/TR/webrtc-stats/#dom-rtcicecandidatepairstats
   * and
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidatePairStats/selected#value
   */
  static getSelectedCandidatePairFromStats(stats) {
    if (!stats || typeof stats !== 'object') return null;

    const transport = Object.values(stats).find((stat) => stat.type
      === 'transport') || {};

    return Object.values(stats).find((stat) => stat.type === 'candidate-pair'
      && stat.nominated && (stat.selected
        || stat.id === transport.selectedCandidatePairId));
  }

  /**
   * Get the info about candidate-pair that is being used by the current peer.
   * This function's return value (RTCIceCandidatePair object ) is different
   * from getSelectedCandidatePairFromStats (RTCIceCandidatePairStats object).
   * The information returned here contains the relatedAddress and relatedPort
   * fields (only for candidates that are derived from another candidate, for
   * host candidates, these fields are null). These field can be helpful for
   * debugging network issues. For all the browsers that support iceTransport
   * field of RTCDtlsTransport, we use this function as default to retrieve
   * information about current selected-pair. For other browsers we retrieve it
   * from getSelectedCandidatePairFromStats
   *
   * @returns {Object} An RTCIceCandidatePair represented the selected
   *                   candidate-pair of the active peer.
   *
   * For more info see:
   * https://www.w3.org/TR/webrtc/#dom-rtcicecandidatepair
   * and
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidatePair
   * and
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCDtlsTransport
   */
  getSelectedCandidatePairFromPeer() {
    const bridge = this.getCurrentBridge();

    if (!bridge) return null;

    const peer = bridge.getPeerConnection();

    if (!peer) return null;

    let selectedPair = null;

    const receivers = peer.getReceivers();
    if (receivers && receivers[0] && receivers[0].transport
        && receivers[0].transport.iceTransport
        && receivers[0].transport.iceTransport) {
      selectedPair = receivers[0].transport.iceTransport
        .getSelectedCandidatePair();
    }

    return selectedPair;
  }

  /**
   * Gets the selected local-candidate information. For browsers that support
   * iceTransport property (see getSelectedCandidatePairFromPeer) we get this
   * info from peer, otherwise we retrieve this information from getStats() api
   *
   * @param {Object} [stats] The status object returned from getStats() api
   * @returns {Object} An Object containing the information about the
   *                   local-candidate. For browsers that support iceTransport
   *                   property, the object's type is RCIceCandidate. A
   *                   RTCIceCandidateStats is returned, otherwise.
   *
   * For more info see:
   * https://www.w3.org/TR/webrtc/#dom-rtcicecandidate
   * and
   * https://www.w3.org/TR/webrtc-stats/#dom-rtcicecandidatestats
   *
   */
  getSelectedLocalCandidate(stats) {
    let selectedPair = this.getSelectedCandidatePairFromPeer();

    if (selectedPair) return selectedPair.local;

    if (!stats) return null;

    selectedPair = AudioManager.getSelectedCandidatePairFromStats(stats);

    if (selectedPair) return stats[selectedPair.localCandidateId];

    return null;
  }

  /**
   * Gets the information about private/public ip address from peer
   * stats. The information retrieved from selected pair from the current
   * RTCIceTransport and returned in a new Object with format:
   * {
   *   address: String,
   *   relatedAddress: String,
   *   port: Number,
   *   relatedPort: Number,
   *   candidateType: String,
   *   selectedLocalCandidate: Object,
   * }
   *
   * If users isn't behind NAT, relatedAddress and relatedPort may be null.
   *
   * @returns An Object containing the information about private/public IP
   *          addresses and ports.
   *
   * For more information see:
   * https://www.w3.org/TR/webrtc-stats/#dom-rtcicecandidatepairstats
   * and
   * https://www.w3.org/TR/webrtc-stats/#dom-rtcicecandidatestats
   * and
   * https://www.w3.org/TR/webrtc/#rtcicecandidatetype-enum
   */
  async getInternalExternalIpAddresses(stats) {
    let transports = {};

    if (stats) {
      const selectedLocalCandidate = this.getSelectedLocalCandidate(stats);

      if (!selectedLocalCandidate) return transports;

      const candidateType = selectedLocalCandidate.candidateType
        || selectedLocalCandidate.type;

      transports = {
        isUsingTurn: (candidateType === 'relay'),
        address: selectedLocalCandidate.address,
        relatedAddress: selectedLocalCandidate.relatedAddress,
        port: selectedLocalCandidate.port,
        relatedPort: selectedLocalCandidate.relatedPort,
        candidateType,
        selectedLocalCandidate,
      };
    }

    return transports;
  }

  /**
   * Get stats about active audio peer.
   * We filter the status based on FILTER_AUDIO_STATS constant.
   * We also append to the returned object the information about peer's
   * transport. This transport information is retrieved by
   * getInternalExternalIpAddressesFromPeer().
   *
   * @returns An Object containing the status about the active audio peer.
   *
   * For more information see:
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getStats
   * and
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCStatsReport
   */
  async getStats() {
    const bridge = this.getCurrentBridge();

    if (!bridge) return null;

    const peer = bridge.getPeerConnection();

    if (!peer) return null;

    const peerStats = await peer.getStats();

    const audioStats = {};

    peerStats.forEach((stat) => {
      if (FILTER_AUDIO_STATS.includes(stat.type)) {
        audioStats[stat.id] = stat;
      }
    });

    const transportStats = await this
      .getInternalExternalIpAddresses(audioStats);

    return { transportStats, ...audioStats };
  }

  async handleTranslationChannelStateChange(languageExtension, message) {
    if(message && message.hasOwnProperty('status')) this.translationState = message.status;
    this.$translationChannelSelected.next(languageExtension);
    this.notifyTranslationChannelStateChange(languageExtension, message);
  }

  async notifyTranslationChannelStateChange(languageExtension, message) {
    this.translationStateCallbacks.forEach(callback => callback(message, languageExtension));
  }

  onTranslationChannelStateChange(translationStateChangeCallback) {
    this.translationStateCallbacks.add(translationStateChangeCallback);
  }

  resetTranslationChannelSelected() {
    this.$translationChannelSelected.next(-1);
  }

  openTranslationChannel(languageExtension) {
    return new Promise((resolve, reject) => {
      if (this.translationBridge && this.translationBridge.activeSession) {
        this.translationBridge.exitAudio()
        this.translationBridge.userData.languageExtension = -1;
      }
      //create a dummy stream that does nothing at all
      let ac = new AudioContext();
      let dest = ac.createMediaStreamDestination();

      if (languageExtension >= 0) {
        const callOptions = {
          isListenOnly: true,
          extension: null,
          inputStream: dest.stream,
        };

        if(this.translationBridge) {
          this.translationBridge.userData.voiceBridge = this.userData.voiceBridge.toString() + languageExtension;
            this.translationBridge.joinAudio(callOptions, (message) => {
              if (message.status == CALL_STATES.STARTED) {
                resolve(languageExtension);
              }
              return this.handleTranslationChannelStateChange(languageExtension, message);
            });
          this.translationBridge.userData.languageExtension = languageExtension;
        }
      } else {
        this.resetTranslationChannelSelected();
        resolve(-1);
      }
    });

  }

  async openTranslatorChannel(languageExtension, onConnected) {

    if(this.translatorBridge && this.translatorBridge.activeSession ) {
      this.translatorChannelOpen = false;
      this.translatorBridge.exitAudio();
      this.translatorSpeechEvents.stop();
    }

    if( languageExtension >= 0 ) {
      let success = (inputStream) => {
        let speechEventsOptions = {
          interval: 200,
          threshold: this.$translatorSpeechDetectionThresholdChanged.value,
          play: false,
        };
        let hark = window.hark;
        this.translatorStream = inputStream
        this.translatorSpeechEvents = hark(inputStream, speechEventsOptions);
        this.translatorSpeechEvents.on('speaking', () => {
          this.$translatorSpeakingChanged.next(true);
          Meeting.changeTranslatorSpeackState(languageExtension, true);
        });

        this.translatorSpeechEvents.on('volume_change', () => {
          const translatorIsSpeaking = this.translatorSpeechEvents.speaking;
          if (translatorIsSpeaking && (!this.translatorSpeechEvents.lastTimestamp || Date.now() - this.translatorSpeechEvents.lastTimestamp > 2000)) {
            this.translatorSpeechEvents.lastTimestamp = Date.now();
            Meeting.changeTranslatorSpeackState(languageExtension, translatorIsSpeaking);
          }
        });

        this.translatorSpeechEvents.on('stopped_speaking', () => {
          this.$translatorSpeakingChanged.next(false);
          Meeting.changeTranslatorSpeackState(languageExtension, false);
        });

        if (this.$translatorChannelLanguageExtensionChanged.value > -1) {
          Meeting.changeTranslatorSpeackState(this.$translatorChannelLanguageExtensionChanged.value, false);
        }

        this.$translatorChannelLanguageExtensionChanged.next(languageExtension);
        const callOptions = {
          isListenOnly: false,
          extension: null,
          inputStream: inputStream,
        };
        if(this.translatorBridge) this.translatorBridge.userData.voiceBridge = this.userData.voiceBridge.toString() + languageExtension;
        let callback = function (message) {
          if (onConnected) {
            onConnected(message);
          }
          return new Promise(function () {})
        }.bind(this);

        let translatorBridgechangeInputDeviceIdPromise = Promise.resolve();
        if (this.inputDevice.id) {
          translatorBridgechangeInputDeviceIdPromise = this.translatorBridge.changeInputDeviceId(this.inputDevice.id);
        }
        translatorBridgechangeInputDeviceIdPromise.then(() => this.translatorBridge.joinAudio(callOptions, callback));
        this.translatorChannelOpen = true;
        Service.muteMicrophone();
        this.restoreMuteState(true);
      }
      return navigator.mediaDevices.getUserMedia({ audio: { deviceId: this.inputDeviceId }, video: false }).then(success.bind(this));
    }else{
      let mainaudio = document.getElementById("remote-media")
      mainaudio.vol = 1
      this._muteTranslator();
      this.restoreMuteState(false);
    }

  }

  /**
   * Check current channel is translation or floor, and set the mute state according to the mute intent.
   * @param isTranslator
   */
  restoreMuteState(isTranslator) {
    let muteIntended = this.$muteIntended.value;
    if(isTranslator) {
      if(muteIntended) this._muteTranslator();
      else this._unmuteTranslator();
    } else {
      if(muteIntended) Service.muteMicrophone();
      else Service.unmuteMicrophone();
    }
  }

  getTranslationFloorVolumeByExt(pExt) {
    if(pExt === -1) return 1;
    let tIdx = pExt;
    if(pExt.toString().length === 3) {
      tIdx = parseInt((pExt+ '').charAt(2));
    }
    let val = Array.isArray(this.translationOriginalVolume) && typeof this.translationOriginalVolume[tIdx] !== 'undefined'
      ? this.translationOriginalVolume[tIdx]
      : TRANSLATION_SETTINGS.hasOwnProperty('floorVolume')
        ? TRANSLATION_SETTINGS.floorVolume
        : 0.4;
    return val;
  }

  setTranslationFloorVolumeByExt(pExt) {
    let val = this.getTranslationFloorVolumeByExt(pExt)
    this.setFloorOutputVolume(val);
  }

  setFloorOutputVolume(volume) {
    const floorMediaElement = document.querySelector(MEDIA_TAG);
    const translationMediaElement = document.querySelector("#translation-media");
    floorMediaElement.volume = volume;
    translationMediaElement.volume = 1 - volume;

  }

  isTranslationEnabled() {
    return (TRANSLATION_SETTINGS.hasOwnProperty('enabled') && TRANSLATION_SETTINGS.enabled) || false;
  }

  muteTranslator() {
    this.$muteIntended.next(true);
    this._muteTranslator();
  }

  _muteTranslator() {
    this.$translatorMuted.next(true);
    this.notifyMuteStateListener();
  }

  unmuteTranslator() {
    this.$muteIntended.next(false);
    this._unmuteTranslator();
  }

  _unmuteTranslator() {
    this.$translatorMuted.next(false);
    this.notifyMuteStateListener();
  }

  toggleMuteTranslator() {
    if (this.isTranslatorMuted()) {
      this.unmuteTranslator();
    } else {
      this.muteTranslator();
    }
  }

  isTranslatorMuted() {
    return this.$translatorMuted.value;
  }

  registerMuteStateListener( callback ) {
    this.muteStateCallbacks.add(callback);
  }

  async notifyMuteStateListener() {
    this.muteStateCallbacks.forEach(callback => callback());
  }

  resetCurrentTranslatorChannelExtension() {
    this.$translatorChannelLanguageExtensionChanged.next(-1);
  }
}

const audioManager = new AudioManager();
export default audioManager;
