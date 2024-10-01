import React from 'react';
import PropTypes from 'prop-types';
import Styled from './styles';

const propTypes = {
  children: PropTypes.node,
  moderator: PropTypes.bool,
  presenter: PropTypes.bool,
  talking: PropTypes.bool,
  muted: PropTypes.bool,
  listenOnly: PropTypes.bool,
  voice: PropTypes.bool,
  noVoice: PropTypes.bool,
  color: PropTypes.string,
  emoji: PropTypes.bool,
  avatar: PropTypes.string,
  className: PropTypes.string,
  isSkeleton: PropTypes.bool,
  whiteboardAccess: PropTypes.bool,
  animations: PropTypes.bool,
  hasPadding: PropTypes.bool,
};

const UserAvatar = ({
  children = <></>,
  moderator = false,
  presenter = false,
  className = '',
  talking = false,
  muted = false,
  listenOnly = false,
  color = '#000',
  voice = false,
  emoji = false,
  avatar = '',
  noVoice = false,
  whiteboardAccess = false,
  isSkeleton = false,
  animations = true,
  hasPadding = true,
}) => (
  <>
    {isSkeleton && (<Styled.Skeleton>{children}</Styled.Skeleton>)}

    {!isSkeleton && (
      <Styled.Avatar
        aria-hidden="true"
        data-test={moderator ? 'moderatorAvatar' : 'viewerAvatar'}
        moderator={moderator}
        presenter={presenter}
        className={className}
        whiteboardAccess={whiteboardAccess && !presenter}
        muted={muted}
        listenOnly={listenOnly}
        voice={voice}
        noVoice={noVoice && !listenOnly}
        hasPadding={hasPadding}
        style={{
          backgroundColor: color,
          color, // We need the same color on both for the border
        }}
      >
        <Styled.Talking talking={talking && !muted} animations={animations} />

        {avatar.length !== 0 && !emoji
          ? (
            <Styled.Image>
              <Styled.Img
                moderator={moderator}
                src={avatar}
              />
            </Styled.Image>
          ) : (
            <Styled.Content>
              {children}
            </Styled.Content>
          )}
      </Styled.Avatar>
    )}
  </>
);

UserAvatar.propTypes = propTypes;

export default UserAvatar;
