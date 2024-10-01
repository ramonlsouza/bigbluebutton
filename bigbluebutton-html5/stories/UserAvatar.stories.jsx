import UserAvatar from '/imports/ui/components/user-avatar/component';
import './UserAvatar.css';
import '/public/stylesheets/normalize.css';
import '/public/stylesheets/bbb-icons.css';
import '/public/stylesheets/fonts.css';
import '/public/stylesheets/fontSizing.css';
import '/public/stylesheets/modals.css';
import '/public/stylesheets/toastify.css';

export default {
  title: 'User Avatar',
  component: UserAvatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: {
        type: 'text',
      },
    },
    moderator: {
      control: {
        type: 'boolean',
      },
    },
    presenter: {
      control: {
        type: 'boolean',
      },
    },
    talking: {
      control: {
        type: 'boolean',
      },
    },
    muted: {
      control: {
        type: 'boolean',
      },
    },
    listenOnly: {
      control: {
        type: 'boolean',
      },
    },
    color: {
      control: {
        type: 'color',
      },
    },
    voice: {
      control: {
        type: 'boolean',
      },
    },
    emoji: {
      control: {
        type: 'boolean',
      },
    },
    avatar: {
      control: {
        type: 'text',
      },
    },
    noVoice: {
      control: {
        type: 'boolean',
      },
    },
    whiteboardAccess: {
      control: {
        type: 'boolean',
      },
    },
    className: {
      control: {
        type: 'text',
      },
    },
    isSkeleton: {
      control: {
        type: 'boolean',
      },
    },
  },
};

export const Default = {
  args: {
    children: 'Us',
    moderator: false,
    presenter: false,
    talking: false,
    muted: false,
    listenOnly: false,
    color: '#4527a0',
    voice: false,
    emoji: false,
    avatar: '',
    noVoice: false,
    whiteboardAccess: false,
    className: '',
    isSkeleton: false,
  },
};
