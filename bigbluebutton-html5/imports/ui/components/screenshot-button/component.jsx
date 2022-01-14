import React from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import Button from '/imports/ui/components/button/component';
import cx from 'classnames';
import PropTypes from 'prop-types';
import { styles } from './styles';
import html2canvas from 'html2canvas';
import { toJpeg, toPng } from 'html-to-image';

const intlMessages = defineMessages({
  
});

const propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  dark: PropTypes.bool,
  bottom: PropTypes.bool,
  className: PropTypes.string,
  color: PropTypes.string,
};

const defaultProps = {
  dark: false,
  bottom: false,
  className: '',
  color: 'default',
};

const ScreenshotButtonComponent = ({
  intl,
  dark,
  bottom,
  className,
  color,
}) => {
  const wrapperClassName = cx({
    [styles.wrapper]: true,
    [styles.dark]: dark,
    [styles.light]: !dark,
    [styles.top]: !bottom,
    [styles.bottom]: bottom,
  });

  const handleClick = () => {
    if (document.querySelector('#screenshotContainer')) {
      toPng(document.querySelector('#screenshotContainer'), {
        pixelRatio: 1,
        
      }).then(function(dataURL) {
        const link = document.createElement('a');
        link.setAttribute('href', dataURL);
        link.setAttribute('download', 'screenshot');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
      });
    }
  };

  const buttonClassName = cx({
    [styles.button]: true,
    [className]: true,
  });

  return (
    <div className={wrapperClassName}>
      <Button
        color={color || 'default'}
        customIcon="Screenshot"
        size="sm"
        onClick={() => handleClick()}
        label="Take a screenshot"
        hideLabel
        className={buttonClassName}
        data-test="presentationScreenshotButton"
      />
    </div>
  );
};

ScreenshotButtonComponent.propTypes = propTypes;
ScreenshotButtonComponent.defaultProps = defaultProps;

export default injectIntl(ScreenshotButtonComponent);
