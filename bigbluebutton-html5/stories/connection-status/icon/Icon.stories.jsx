import React from 'react';
import Icon from '/imports/ui/components/connection-status/icon/component';

/**
 * Gray background only for better visualization, not part of the component.
 */
export default {
  title: 'Connection Status/Icon',
  component: Icon,
  decorators: [
    (Story, { args }) => {
      const { level, grayscale } = args;

      if (grayscale) {
        return (
          <div style={{
            width: '2em',
            height: '2em',
            padding: '1em',
            background: '#aaa',
          }}
          >
            <Story />
          </div>
        );
      }

      switch (level) {
        case 'normal':
          return (
            <div style={{
              width: '2em',
              height: '2em',
              padding: '1em',
              background: '#aaa',
            }}
            >
              <Story />
            </div>
          );
        default:
          return (
            <div style={{
              width: '2em',
              height: '2em',
              padding: '1em',
            }}
            >
              <Story />
            </div>
          );
      }
    },
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    level: {
      options: [
        'normal',
        'warning',
        'danger',
        'critical',
      ],
      control: { type: 'select' },
    },
    grayscale: {
      control: {
        type: 'boolean',
      },
    },
  },
};

export const Default = {
  args: {
    level: 'normal',
    grayscale: false,
  },
};
