import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import _ from 'lodash';
import Styled from './styles';
import ChatLogger from '/imports/ui/components/chat/chat-logger/ChatLogger';
import TimeWindowChatItem from './time-window-chat-item/container';

const propTypes = {
  scrollPosition: PropTypes.number,
  chatId: PropTypes.string.isRequired,
  handleScrollUpdate: PropTypes.func.isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  id: PropTypes.string.isRequired,
};

const defaultProps = {
  scrollPosition: null,
};

const intlMessages = defineMessages({
  moreMessages: {
    id: 'app.chat.moreMessages',
    description: 'Chat message when the user has unread messages below the scroll',
  },
  emptyLogLabel: {
    id: 'app.chat.emptyLogLabel',
    description: 'aria-label used when chat log is empty',
  },
});
class TimeWindowList extends PureComponent {
  constructor(props) {
    super(props);
    this.userScrolledBack = false;
    this.handleScrollUpdate = _.debounce(this.handleScrollUpdate.bind(this), 150);
    this.scrollTo = _.debounce(this.scrollTo.bind(this), 150);
    this.systemMessagesResized = {};

    this.state = {
      shouldScrollToPosition: false,
      scrollPosition: 0,
      userScrolledBack: false,
      lastMessage: {},
      fontsLoaded: false,
    };
    this.systemMessageIndexes = [];

    this.listRef = null;
    this.virualRef = null;

    this.lastWidth = 0;

    document.fonts.onloadingdone = () => this.setState({fontsLoaded: true});
  }

  componentDidMount() {
    const { scrollPosition: scrollProps } = this.props;

    this.setState({
      scrollPosition: scrollProps,
    });
  }

  componentDidUpdate(prevProps) {
    ChatLogger.debug('TimeWindowList::componentDidUpdate', { ...this.props }, { ...prevProps });
    if (this.virualRef) {
      if (this.virualRef.style.direction !== document.documentElement.dir) {
        this.virualRef.style.direction = document.documentElement.dir;
      }
    }

    const {
      userSentMessage,
      setUserSentMessage,
      timeWindowsValues,
      chatId,
      scrollPosition: scrollProps,
      count,
    } = this.props;

    const { userScrolledBack } = this.state;

    if((count > 0 && !userScrolledBack) || userSentMessage || !scrollProps) {
      const lastItemIndex = timeWindowsValues.length - 1;

      this.setState({
        scrollPosition: lastItemIndex,
      }, ()=> this.scrollTo(lastItemIndex));
    }

    const {
      chatId: prevChatId,
    } = prevProps;

    if (prevChatId !== chatId) {
      this.setState({
        scrollPosition: scrollProps,
      });
    }

    if (userSentMessage && !prevProps.userSentMessage) {
      this.scrollTo(timeWindowsValues.length - 1);

      this.setState({
        userScrolledBack: false,
      }, () => setUserSentMessage(false));
    }
  }

  handleScrollUpdate(position, target) {
    const {
      handleScrollUpdate,
    } = this.props;

    if (position !== null && position + target?.offsetHeight === target?.scrollHeight) {
      // I used one because the null value is used to notify that
      // the user has sent a message and the message list should scroll to bottom
      handleScrollUpdate(1);
      return;
    }

    handleScrollUpdate(position || 1);
  }

  scrollTo(position = null) {
    if (this.listRef && position) {
      this.listRef.scrollToIndex({
        index: position,
        align: 'end',
        behavior: 'auto'
      });

      this.handleScrollUpdate(position);
    }
  }

  renderUnreadNotification() {
    const {
      intl,
      count,
      timeWindowsValues,
    } = this.props;
    const { userScrolledBack } = this.state;

    if (count && userScrolledBack) {
      return (
        <Styled.UnreadButton
          aria-hidden="true"
          color="primary"
          size="sm"
          key="unread-messages"
          label={intl.formatMessage(intlMessages.moreMessages)}
          onClick={() => {
            const lastItemIndex = timeWindowsValues.length - 1;

            this.setState({
              scrollPosition: lastItemIndex,
              userScrolledBack: false,
            });
          }}
        />
      );
    }

    return null;
  }

  render() {
    const {
      timeWindowsValues,
      id,
      dispatch,
      chatId,
    } = this.props;

    ChatLogger.debug('TimeWindowList::render', {...this.props},  {...this.state}, new Date());

    return (
      [
        <Styled.MessageListWrapper
          onMouseDown={() => {
            this.setState({
              userScrolledBack: true,
            });
          }}
          onWheel={(e) => {
            if (e.deltaY < 0) {
              this.setState({
                userScrolledBack: true,
              });
              this.userScrolledBack = true
            }
          }}
          key="chat-list"
          data-test="chatMessages"
          aria-live="polite"
          ref={node => this.messageListWrapper = node}
        >
          <Styled.MessageList
            ref={(ref) => {
              if (ref !== null) {
                this.listRef = ref;
              }
            }}
            data={timeWindowsValues}
            atBottomStateChange={((atBottom) => {
              this.setState({
                userScrolledBack: !atBottom,
              });
            })}
            followOutput={true}
            itemContent={(index, item) => (
              <TimeWindowChatItem
                key={index}
                message={item}
                messageId={item.id}
                chatAreaId={id}
                dispatch={dispatch}
                chatId={chatId}
                index={index}
              />
            )}
          />
        </Styled.MessageListWrapper>,
        this.renderUnreadNotification()
      ]
    );
  }
}

TimeWindowList.propTypes = propTypes;
TimeWindowList.defaultProps = defaultProps;

export default injectIntl(TimeWindowList);
