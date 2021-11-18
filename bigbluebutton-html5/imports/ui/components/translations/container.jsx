import React, { useContext } from 'react';
import Translations from './component';
import LayoutContext from '/imports/ui/components/layout/context';

export default TranslationsContainer = (props) => {
  const layoutContext = useContext(LayoutContext);
  const { layoutContextDispatch } = layoutContext;

  return <Translations {...{ layoutContextDispatch, ...props }} />;
};
