import { type Meta, type StoryObj } from '@storybook/angular';
import { ColorMode } from './color-mode';

const meta: Meta<ColorMode> = {
  title: 'Shell/ColorMode',
  component: ColorMode,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
\`ColorMode\` lets users switch between light, dark, and auto themes.
It renders as a draggable button (\`mode="button"\`) or as a dropdown menu item (\`mode="menu"\`).
The selected mode is persisted via \`UserSettingsService\`.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<ColorMode>;

export const Button: Story = {
  args: {
    mode: 'button',
    options: {
      buttonClass: 'btn-outline-secondary',
    },
  },
};

export const MenuMode: Story = {
  args: {
    mode: 'menu',
  },
};

export const WarningButton: Story = {
  args: {
    mode: 'button',
    options: {
      buttonClass: 'btn-warning',
    },
  },
};
