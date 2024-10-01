import Icon from '/imports/ui/components/common/icon-svg/component';

export default {
  title: 'Common/IconSvg',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    iconName: {
      options: [
        'reactions',
        'recording',
        'whiteboardOptions',
      ],
      control: { type: 'select' },
    },
    rotate: {
      control: {
        type: 'boolean',
      },
    },
    wrapped: {
      control: {
        type: 'boolean',
      },
    },
  },
};

export const Default = {
  args: {
    iconName: '',
    rotate: false,
    wrapped: false,
  },
};
