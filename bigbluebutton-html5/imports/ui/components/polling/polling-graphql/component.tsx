import React, {
  ElementRef, useEffect, useMemo, useRef, useState,
} from 'react';
import { useMutation, useSubscription } from '@apollo/client';
import { defineMessages, useIntl } from 'react-intl';
import { Meteor } from 'meteor/meteor';
import AudioService from '/imports/ui/components/audio/service';
import Checkbox from '/imports/ui/components/common/checkbox/component';
import PollService from '/imports/ui/components/poll/service';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { isPollingEnabled } from '/imports/ui/services/features';
import {
  POLL_SUBMIT_TYPED_VOTE,
  POLL_SUBMIT_VOTE,
} from '/imports/ui/components/poll/mutations';
import {
  hasPendingPoll,
  HasPendingPollResponse,
} from './queries';
import { shouldStackOptions } from './service';
import Styled from './styles';

const MAX_INPUT_CHARS = Meteor.settings.public.poll.maxTypedAnswerLength;

const intlMessages = defineMessages({
  pollingTitleLabel: {
    id: 'app.polling.pollingTitle',
  },
  pollAnswerLabel: {
    id: 'app.polling.pollAnswerLabel',
  },
  pollAnswerDesc: {
    id: 'app.polling.pollAnswerDesc',
  },
  pollQuestionTitle: {
    id: 'app.polling.pollQuestionTitle',
  },
  responseIsSecret: {
    id: 'app.polling.responseSecret',
  },
  responseNotSecret: {
    id: 'app.polling.responseNotSecret',
  },
  submitLabel: {
    id: 'app.polling.submitLabel',
  },
  submitAriaLabel: {
    id: 'app.polling.submitAriaLabel',
  },
  responsePlaceholder: {
    id: 'app.polling.responsePlaceholder',
  },
});

const validateInput = (i: string) => {
  let input = i;
  if (/^\s/.test(input)) input = '';
  return input;
};

interface PollingGraphqlContainerProps {}

interface PollingGraphqlProps {
  handleTypedVote: (pollId: string, answer: string) => void;
  handleVote: (pollId: string, answerIds: Array<number>) => void;
  pollAnswerIds: Record<string, { id: string; description: string }>;
  pollTypes: Record<string, string>;
  isDefaultPoll: (pollType: string) => boolean;
  poll: {
    pollId: string;
    multipleResponses: boolean;
    type: string;
    stackOptions: boolean;
    questionText: string;
    secret: boolean;
    options: Array<{
      optionDesc: string;
      optionId: number;
      pollId: string;
    }>;
  };
}

const PollingGraphql: React.FC<PollingGraphqlProps> = (props) => {
  const {
    handleTypedVote,
    handleVote,
    poll,
    pollAnswerIds,
    pollTypes,
    isDefaultPoll,
  } = props;

  const [typedAns, setTypedAns] = useState('');
  const [checkedAnswers, setCheckedAnswers] = useState<Array<number>>([]);
  const intl = useIntl();
  const responseInput = useRef<ElementRef<'input'>>(null);
  const pollingContainer = useRef<ElementRef<'aside'>>(null);

  useEffect(() => {
    play();
    if (pollingContainer.current) {
      pollingContainer.current.focus();
    }
  }, []);

  const play = () => {
    AudioService.playAlertSound(
      `${
        Meteor.settings.public.app.cdn
        + Meteor.settings.public.app.basename
        + Meteor.settings.public.app.instanceId
      }/resources/sounds/Poll.mp3`,
    );
  };

  const handleUpdateResponseInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (responseInput.current) {
      responseInput.current.value = validateInput(e.target.value);
      setTypedAns(responseInput.current.value);
    }
  };

  const handleSubmit = (pollId: string) => {
    handleVote(pollId, checkedAnswers);
  };

  const handleCheckboxChange = (answerId: number) => {
    if (checkedAnswers.includes(answerId)) {
      checkedAnswers.splice(checkedAnswers.indexOf(answerId), 1);
    } else {
      checkedAnswers.push(answerId);
    }
    checkedAnswers.sort();
    setCheckedAnswers([...checkedAnswers]);
  };

  const handleMessageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.keyCode === 13 && typedAns.length > 0) {
      handleTypedVote(poll.pollId, typedAns);
    }
  };

  const renderButtonAnswers = () => {
    const {
      stackOptions,
      options,
      questionText,
      type,
    } = poll;
    const defaultPoll = isDefaultPoll(type);

    return (
      <div>
        {poll.type !== pollTypes.Response && (
          <span>
            {questionText.length === 0 && (
              <Styled.PollingTitle>
                {intl.formatMessage(intlMessages.pollingTitleLabel)}
              </Styled.PollingTitle>
            )}
            <Styled.PollingAnswers
              removeColumns={options.length === 1}
              stacked={stackOptions}
            >
              {options.map((option) => {
                const formattedMessageIndex = option.optionDesc.toLowerCase();
                let label = option.optionDesc;
                if (
                  (defaultPoll || type.includes('CUSTOM'))
                  && pollAnswerIds[formattedMessageIndex]
                ) {
                  label = intl.formatMessage(
                    pollAnswerIds[formattedMessageIndex],
                  );
                }

                return (
                  <Styled.PollButtonWrapper key={option.optionId}>
                    <Styled.PollingButton
                      color="primary"
                      size="md"
                      label={label}
                      key={option.optionDesc}
                      onClick={() => handleVote(poll.pollId, [option.optionId])}
                      aria-labelledby={`pollAnswerLabel${option.optionDesc}`}
                      aria-describedby={`pollAnswerDesc${option.optionDesc}`}
                      data-test="pollAnswerOption"
                    />
                    <Styled.Hidden id={`pollAnswerLabel${option.optionDesc}`}>
                      {intl.formatMessage(intlMessages.pollAnswerLabel, {
                        0: label,
                      })}
                    </Styled.Hidden>
                    <Styled.Hidden id={`pollAnswerDesc${option.optionDesc}`}>
                      {intl.formatMessage(intlMessages.pollAnswerDesc, {
                        0: label,
                      })}
                    </Styled.Hidden>
                  </Styled.PollButtonWrapper>
                );
              })}
            </Styled.PollingAnswers>
          </span>
        )}
        {poll.type === pollTypes.Response && (
          <Styled.TypedResponseWrapper>
            <Styled.TypedResponseInput
              data-test="pollAnswerOption"
              onChange={(e) => {
                handleUpdateResponseInput(e);
              }}
              onKeyDown={(e) => {
                handleMessageKeyDown(e);
              }}
              type="text"
              placeholder={intl.formatMessage(intlMessages.responsePlaceholder)}
              maxLength={MAX_INPUT_CHARS}
              ref={responseInput}
              onPaste={(e) => {
                e.stopPropagation();
              }}
              onCut={(e) => {
                e.stopPropagation();
              }}
              onCopy={(e) => {
                e.stopPropagation();
              }}
            />
            <Styled.SubmitVoteButton
              data-test="submitAnswer"
              disabled={typedAns.length === 0}
              color="primary"
              size="sm"
              label={intl.formatMessage(intlMessages.submitLabel)}
              aria-label={intl.formatMessage(intlMessages.submitAriaLabel)}
              onClick={() => {
                handleTypedVote(poll.pollId, typedAns);
              }}
            />
          </Styled.TypedResponseWrapper>
        )}
        <Styled.PollingSecret>
          {intl.formatMessage(
            poll.secret
              ? intlMessages.responseIsSecret
              : intlMessages.responseNotSecret,
          )}
        </Styled.PollingSecret>
      </div>
    );
  };

  const renderCheckboxAnswers = () => {
    return (
      <div>
        {poll.questionText.length === 0 && (
          <Styled.PollingTitle>
            {intl.formatMessage(intlMessages.pollingTitleLabel)}
          </Styled.PollingTitle>
        )}
        <Styled.MultipleResponseAnswersTable>
          {poll.options.map((option) => {
            const formattedMessageIndex = option.optionDesc.toLowerCase();
            let label = option.optionDesc;
            if (pollAnswerIds[formattedMessageIndex]) {
              label = intl.formatMessage(pollAnswerIds[formattedMessageIndex]);
            }

            return (
              <Styled.CheckboxContainer key={option.optionId}>
                <td>
                  <Styled.PollingCheckbox data-test="optionsAnswers">
                    <Checkbox
                      id={`answerInput${option.optionDesc}`}
                      onChange={() => handleCheckboxChange(option.optionId)}
                      checked={checkedAnswers.includes(option.optionId)}
                      ariaLabelledBy={`pollAnswerLabel${option.optionDesc}`}
                      ariaDescribedBy={`pollAnswerDesc${option.optionDesc}`}
                    />
                  </Styled.PollingCheckbox>
                </td>
                <Styled.MultipleResponseAnswersTableAnswerText>
                  <label
                    id={`pollAnswerLabel${option.optionDesc}`}
                    htmlFor={`answerInput${option.optionDesc}`}
                  >
                    {label}
                  </label>
                  <Styled.Hidden id={`pollAnswerDesc${option.optionDesc}`}>
                    {intl.formatMessage(intlMessages.pollAnswerDesc, {
                      0: label,
                    })}
                  </Styled.Hidden>
                </Styled.MultipleResponseAnswersTableAnswerText>
              </Styled.CheckboxContainer>
            );
          })}
        </Styled.MultipleResponseAnswersTable>
        <div>
          <Styled.SubmitVoteButton
            disabled={checkedAnswers.length === 0}
            color="primary"
            size="sm"
            label={intl.formatMessage(intlMessages.submitLabel)}
            aria-label={intl.formatMessage(intlMessages.submitAriaLabel)}
            onClick={() => handleSubmit(poll.pollId)}
            data-test="submitAnswersMultiple"
          />
        </div>
      </div>
    );
  };

  return (
    <Styled.Overlay>
      <Styled.PollingContainer
        autoWidth={poll.stackOptions}
        data-test="pollingContainer"
        role="complementary"
        ref={pollingContainer}
        tabIndex={-1}
      >
        {poll.questionText.length > 0 && (
          <Styled.QHeader>
            <Styled.QTitle>
              {intl.formatMessage(intlMessages.pollQuestionTitle)}
            </Styled.QTitle>
            <Styled.QText data-test="pollQuestion">
              {poll.questionText}
            </Styled.QText>
          </Styled.QHeader>
        )}
        {poll.multipleResponses
          ? renderCheckboxAnswers()
          : renderButtonAnswers()}
      </Styled.PollingContainer>
    </Styled.Overlay>
  );
};

const PollingGraphqlContainer: React.FC<PollingGraphqlContainerProps> = () => {
  const { data: currentUserData } = useCurrentUser((u) => ({
    userId: u.userId,
    presenter: u.presenter,
  }));
  const { data: hasPendingPollData, error, loading } = useSubscription<HasPendingPollResponse>(
    hasPendingPoll,
    {
      variables: { userId: currentUserData?.userId },
    },
  );
  console.log(hasPendingPollData, error);
  const [pollSubmitUserTypedVote] = useMutation(POLL_SUBMIT_TYPED_VOTE);
  const [pollSubmitUserVote] = useMutation(POLL_SUBMIT_VOTE);

  const meetingData = hasPendingPollData && hasPendingPollData.meeting[0];
  const pollData = meetingData && meetingData.polls[0];
  const userData = pollData && pollData.users[0];
  const pollExists = !!userData;
  const showPolling = pollExists && !currentUserData?.presenter && isPollingEnabled();
  const stackOptions = useMemo(
    () => !!pollData && shouldStackOptions(pollData.options.map((o) => o.optionDesc)),
    [pollData],
  );

  const handleTypedVote = (pollId: string, answer: string) => {
    pollSubmitUserTypedVote({
      variables: {
        pollId,
        answer,
      },
    });
  };

  const handleVote = (pollId: string, answerIds: Array<number>) => {
    pollSubmitUserVote({
      variables: {
        pollId,
        answerIds,
      },
    });
  };

  if (!showPolling || error || loading) return null;

  return (
    <PollingGraphql
      handleTypedVote={handleTypedVote}
      handleVote={handleVote}
      poll={{
        ...pollData,
        stackOptions,
      }}
      pollAnswerIds={PollService.pollAnswerIds}
      pollTypes={PollService.pollTypes}
      isDefaultPoll={PollService.isDefaultPoll}
    />
  );
};

export default PollingGraphqlContainer;
