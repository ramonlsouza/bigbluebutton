import styled, { css, keyframes } from 'styled-components';
import Icon from '/imports/ui/components/common/icon/component';
import { headingsFontWeight } from '/imports/ui/stylesheets/styled-components/typography';
import {
  colorDanger,
  colorGray,
  colorGrayDark,
  colorSuccess,
  colorGrayLightest,
} from '/imports/ui/stylesheets/styled-components/palette';
import {
  borderSizeLarge,
  lgPaddingX,
  statusIconSize,
  borderSize,
  statusInfoHeight,
} from '/imports/ui/stylesheets/styled-components/general';

const DropdownButton = styled.button`
  background-color: #FFF;
  border: none;
  border-radius: 7px;
  color: ${colorGrayDark};
  cursor: pointer;
  padding: .3rem .5rem;
  padding-bottom: 6px;
  tab-index: 0;

  &:hover {
    background-color: #ececec;
  }
`;

const Right = styled.div`
  cursor: pointer;
  position: absolute;
  left: auto;
  top: .5rem;
  right: .5rem;
  z-index: 999;

  [dir="rtl"] & {
    right: auto;
    left : ${borderSize};
  }
`;

const ToastText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  white-space: nowrap;
  position: relative;
  top: ${borderSizeLarge};
  width: auto;
  font-weight: ${headingsFontWeight};

  [dir="rtl"] & {
    text-align: right;
  }
`;

const StatusIcon = styled.span`
  margin-left: auto;

  [dir="rtl"] & {
    margin-right: auto;
    margin-left: 0;
  }

  & > i {
    position: relative;
    top: 1px;
    height: ${statusIconSize};
    width: ${statusIconSize};
  }
`;

const rotate = keyframes`
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
`;

const ToastIcon = styled(Icon)`
  position: relative;
  width: ${statusIconSize};
  height: ${statusIconSize};
  font-size: 117%;
  bottom: ${borderSize};
  left: ${statusInfoHeight};

  [dir="rtl"] & {
    left: auto;
    right: ${statusInfoHeight};
  }

  ${({ done }) => done && `
    color: ${colorSuccess};
  `}

  ${({ error }) => error && `
    color: ${colorDanger};
  `}

  ${({ loading }) => loading && css`
    color: ${colorGrayLightest};
    border: 1px solid;
    border-radius: 50%;
    border-right-color: ${colorGray};
    animation: ${rotate} 1s linear infinite;
  `}
`;

const Line = styled.div`
  display: flex;
  width: 100%;
  flex-wrap: nowrap;
  padding: ${lgPaddingX} 0;
`;

const ButtonIcon = styled(Icon)`
  width: 1em;
  text-align: center;
`;

export default {
  DropdownButton,
  Right,
  ToastText,
  StatusIcon,
  ToastIcon,
  Line,
  ButtonIcon,
};
