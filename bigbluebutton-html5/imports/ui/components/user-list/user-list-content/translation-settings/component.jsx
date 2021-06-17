import {styles} from "./styles.scss";
import  {styles as cstyles} from '/imports/ui/components/user-list/user-list-content/styles';

import React, {Component} from 'react';
import {defineMessages} from 'react-intl';
import AudioManager from '/imports/ui/services/audio-manager';
import Meeting from "../../../../services/meeting";


const intlMessages = defineMessages({
  originLanguage: {
    id: 'app.translation.language.origin',
    description: 'Name of origin language',
    defaultMessage: 'Floor',
  },
  noneLanguage: {
    id: 'app.translation.language.none',
    description: 'Name of none language',
    defaultMessage: 'None',
  },
  originalVolume: {
    id: 'app.translation.language.originalVolume',
    description: 'Name of original volume header',
    defaultMessage: 'None',
  }
});

class TranslationSettings extends Component {

  state = {
    languages: [],
    translationOriginalVolume: AudioManager.translationOriginalVolume
  };

  componentDidMount() {

    this.getLanguages();
  }

  getLanguages() {
    Meeting.getLanguages().then(languages => {
      languages.push({
        name: this.props.intl.formatMessage(this.props.translator ? intlMessages.noneLanguage : intlMessages.originLanguage),
        extension: -1,
      });

      this.setState({languages: languages})

    })
    this.forceUpdate();
  }

  setTranslationOriginalVolume(pEvent) {
    if (pEvent.target.dataset.hasOwnProperty("ext")) {
      AudioManager.$translationOriginalVolumeChanged.next({
        extension: pEvent.target.dataset["ext"],
        volume: pEvent.target.value
      });
    }
  }

  render() {
    const {
      intl,
    } = this.props;

    return (
      <div key={"translation-settings"}>
        <div className={cstyles.container}>
          <h2 className={cstyles.smallTitle}>
            {intl.formatMessage(intlMessages.originalVolume)}
          </h2>
        </div>
        {this.state.languages.map(function (language, index) {
          if(language.extension >= 0) return (
            <div className={styles.translationOriginalVolumePanel}>
              <div>{language.name}:</div>

              <input type="range" data-ext={index} id="volume" name="volume" min="0" max="1" step=".01"
                     defaultValue={this.state.translationOriginalVolume[index]}
                     onChange={this.setTranslationOriginalVolume.bind(this)}/>
            </div>
          )
        }, this)
        }
      </div>


    );
  }
}

export default TranslationSettings;
