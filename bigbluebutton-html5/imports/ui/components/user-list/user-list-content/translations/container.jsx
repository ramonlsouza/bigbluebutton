import React, { useContext } from 'react';
import Translations from './component';
import LayoutContext from '../../../layout/context';

export default TranslationsContainer = (props) => {
  const layoutContext = useContext(LayoutContext);
  const { layoutContextState, layoutContextDispatch } = layoutContext;
  const { input } = layoutContextState;
  const { sidebarContent } = input;
  const { sidebarContentPanel } = sidebarContent;

  return <Translations {...{ layoutContextDispatch, sidebarContentPanel, ...props }} />;
};
