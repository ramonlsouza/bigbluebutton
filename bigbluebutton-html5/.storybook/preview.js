/** @type { import('@storybook/react').Preview } */

import '/public/stylesheets/bbb-icons.css';

const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
