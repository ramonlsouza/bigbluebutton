import React, { Component } from 'react';
import { styles } from './styles.scss';
import { defineMessages } from 'react-intl';
import cx from 'classnames';
import { ACTIONS, PANELS } from '/imports/ui/components/layout/enums';

const intlMessages = defineMessages({
    translationTitle: {
        id: 'app.translation.translation.title',
        description: 'Translation title',
        defaultMessage: 'Translation',
    },
    languagesTitle: {
        id: 'app.translation.languages.title',
        description: 'Languages title',
        defaultMessage: 'Languages',
    },
});

class Translations extends Component{
    toggleLanguagesPanel = () => {
        const {
            layoutContextDispatch,
            sidebarContentPanel,
        } = this.props;

        layoutContextDispatch({
            type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
            value: sidebarContentPanel !== PANELS.TRANSLATIONS,
          });
          layoutContextDispatch({
            type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
            value:
              sidebarContentPanel === PANELS.TRANSLATIONS
                ? PANELS.NONE
                : PANELS.TRANSLATIONS,
          });
    }

    componentDidMount() {
        window.addEventListener('panelChanged',()=>{
            this.forceUpdate()
        });
    }


    render() {
        const {
            intl,
        } = this.props;

        let active = ""
        if(Session.get("openPanel") ===  "translations"){
            active = styles.active
        }
        return (
            <div key={"translation-options"}>
                <h2 className={styles.smallTitle}>
                    {intl.formatMessage(intlMessages.translationTitle)}
                </h2>
                <div className={cx(styles.translationContainer, active)}>
                    <img
                        className="icon-bbb-languages"
                        src='/html5client/svgs/translations.svg'
                    />
                    <span className={styles.optionName} onClick={this.toggleLanguagesPanel}>
                        {intl.formatMessage(intlMessages.languagesTitle)}
                    </span>
                </div>
            </div>
        );
    }
}

export default Translations;
