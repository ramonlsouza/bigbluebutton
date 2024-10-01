import React, { memo } from 'react';
import Styled from './styles';

interface IconProps {
  iconName: string;
  rotate?: boolean;
  wrapped?: boolean;
}

const iconsMap: { [key: string]: JSX.Element } = {
  reactions: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M18.4 7.4C18.4 7.73137 18.6686 8 19 8C19.3313 8 19.6 7.73137 19.6 7.4L19.6 5.6001L21.4 5.6001C21.7314 5.6001 22 5.33147 22 5.0001C22 4.66873 21.7314 4.4001 21.4 4.4001L19.6 4.4001L19.6 2.6C19.6 2.26863 19.3313 2 19 2C18.6686 2 18.4 2.26863 18.4 2.6L18.4 4.4001L16.6 4.4001C16.2686 4.4001 16 4.66873 16 5.0001C16 5.33147 16.2686 5.6001 16.6 5.6001L18.4 5.6001L18.4 7.4Z" fill="currentcolor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M21.1677 8.68087C21.5494 9.73518 21.75 10.8572 21.75 12C21.75 13.2804 21.4978 14.5482 21.0078 15.7312C20.5178 16.9141 19.7997 17.9889 18.8943 18.8943C17.9889 19.7997 16.9141 20.5178 15.7312 21.0078C14.5482 21.4978 13.2804 21.75 12 21.75C10.7196 21.75 9.45176 21.4978 8.26884 21.0078C7.08591 20.5178 6.01108 19.7997 5.10571 18.8943C4.20034 17.9889 3.48216 16.9141 2.99217 15.7312C2.50219 14.5482 2.25 13.2804 2.25 12C2.25 9.41414 3.27723 6.93419 5.10571 5.10571C6.93419 3.27723 9.41414 2.25 12 2.25C13.1428 2.25 14.2648 2.45062 15.3191 2.83234C15.1347 3.29419 15.0247 3.79374 15.0037 4.31623C14.0555 3.94554 13.0378 3.75 12 3.75C9.81196 3.75 7.71354 4.61919 6.16637 6.16637C4.61919 7.71354 3.75 9.81196 3.75 12C3.75 13.0834 3.96339 14.1562 4.37799 15.1571C4.79259 16.1581 5.40029 17.0675 6.16637 17.8336C6.93245 18.5997 7.84193 19.2074 8.84286 19.622C9.8438 20.0366 10.9166 20.25 12 20.25C13.0834 20.25 14.1562 20.0366 15.1571 19.622C16.1581 19.2074 17.0675 18.5997 17.8336 17.8336C18.5997 17.0675 19.2074 16.1581 19.622 15.1571C20.0366 14.1562 20.25 13.0834 20.25 12C20.25 10.9622 20.0545 9.94455 19.6838 8.99632C20.2063 8.97533 20.7058 8.86526 21.1677 8.68087ZM9.375 8.25C8.83414 8.25 8.54662 8.66921 8.43905 8.88434C8.30893 9.14459 8.25 9.45169 8.25 9.75C8.25 10.0483 8.30893 10.3554 8.43905 10.6157C8.54662 10.8308 8.83414 11.25 9.375 11.25C9.91586 11.25 10.2034 10.8308 10.3109 10.6157C10.4411 10.3554 10.5 10.0483 10.5 9.75C10.5 9.45169 10.4411 9.14459 10.3109 8.88434C10.2034 8.66921 9.91586 8.25 9.375 8.25ZM14.625 8.25C14.0841 8.25 13.7966 8.66921 13.6891 8.88434C13.5589 9.14459 13.5 9.45169 13.5 9.75C13.5 10.0483 13.5589 10.3554 13.6891 10.6157C13.7966 10.8308 14.0841 11.25 14.625 11.25C15.1659 11.25 15.4534 10.8308 15.5609 10.6157C15.6911 10.3554 15.75 10.0483 15.75 9.75C15.75 9.45169 15.6911 9.14459 15.5609 8.88434C15.4534 8.66921 15.1659 8.25 14.625 8.25ZM9.34833 14.6517C9.05544 14.3588 8.58057 14.3588 8.28767 14.6517C7.99478 14.9446 7.99478 15.4194 8.28767 15.7123C8.77518 16.1998 9.35393 16.5866 9.9909 16.8504C10.6279 17.1142 11.3106 17.25 12 17.25C12.6894 17.25 13.3721 17.1142 14.0091 16.8504C14.6461 16.5866 15.2248 16.1998 15.7123 15.7123C16.0052 15.4194 16.0052 14.9446 15.7123 14.6517C15.4194 14.3588 14.9446 14.3588 14.6517 14.6517C14.3034 14.9999 13.89 15.2761 13.4351 15.4646C12.9801 15.653 12.4925 15.75 12 15.75C11.5075 15.75 11.0199 15.653 10.5649 15.4646C10.11 15.2761 9.69655 14.9999 9.34833 14.6517Z" fill="currentcolor" />
    </svg>
  ),
  recording: (
    <svg height="18" viewBox="0 0 20 20" version="1" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentcolor" fill="currentcolor" strokeLinecap="square">
        <circle fill="none" strokeWidth="1" r="9" cx="10" cy="10" />
        <circle stroke="currentcolor" fill="currentcolor" r="4" cx="10" cy="10" />
      </g>
    </svg>
  ),
  whiteboardOptions: (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="
          M9 11.25H11.25
          M11.25 11.25H13.5
          M11.25 11.25V9
          M11.25 11.25V13.5
          M4 7H5.5
          C5.89782 7 6.27936 6.84196 6.56066 6.56066
          C6.84196 6.27936 7 5.89782 7 5.5V4
          C7 3.60218 6.84196 3.22064 6.56066 2.93934
          C6.27936 2.65804 5.89782 2.5 5.5 2.5H4
          C3.60218 2.5 3.22064 2.65804 2.93934 2.93934
          C2.65804 3.22064 2.5 3.60218 2.5 4V5.5
          C2.5 5.89782 2.65804 6.27936 2.93934 6.56066
          C3.22064 6.84196 3.60218 7 4 7
          ZM4 13.5H5.5
          C5.89782 13.5 6.27936 13.342 6.56066 13.0607
          C6.84196 12.7794 7 12.3978 7 12V10.5
          C7 10.1022 6.84196 9.72064 6.56066 9.43934
          C6.27936 9.15804 5.89782 9 5.5 9H4
          C3.60218 9 3.22064 9.15804 2.93934 9.43934
          C2.65804 9.72064 2.5 10.1022 2.5 10.5V12
          C2.5 12.3978 2.65804 12.7794 2.93934 13.0607
          C3.22064 13.342 3.60218 13.5 4 13.5
          ZM10.5 7H12
          C12.3978 7 12.7794 6.84196 13.0607 6.56066
          C13.342 6.27936 13.5 5.89782 13.5 5.5V4
          C13.5 3.60218 13.342 3.22064 13.0607 2.93934
          C12.7794 2.65804 12.3978 2.5 12 2.5H10.5
          C10.1022 2.5 9.72064 2.65804 9.43934 2.93934
          C9.15804 3.22064 9 3.60218 9 4V5.5
          C9 5.89782 9.15804 6.27936 9.43934 6.56066
          C9.72064 6.84196 10.1022 7 10.5 7
        "
        stroke="currentcolor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const Icon: React.FC<IconProps> = ({
  iconName = '',
  rotate = false,
  wrapped = false,
}) => {
  if (!iconsMap[iconName]) {
    return null;
  }

  if (!wrapped) {
    return iconsMap[iconName];
  }

  return (
    <Styled.Icon $rotate={rotate}>
      {iconsMap[iconName]}
    </Styled.Icon>
  );
};

export default memo(Icon);
