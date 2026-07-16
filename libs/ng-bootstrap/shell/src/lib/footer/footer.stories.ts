import { provideRouter } from '@angular/router';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { FooterComponent } from './footer.component';
import { provideRnForgeShellConfig } from '../shell.config';

const meta: Meta<FooterComponent> = {
  title: 'Shell/Footer',
  component: FooterComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideRouter([]), provideRnForgeShellConfig({})],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
\`FooterComponent\` renders a responsive Bootstrap footer with optional brand,
copyright text, and nav links. Configure via \`provideRnForgeShellConfig\` or the \`[options]\` input.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<FooterComponent>;

const FOOTER_NAV = {
  type: 'footer' as const,
  items: [
    { type: 'link' as const, label: 'Privacy', href: '/privacy' },
    { type: 'link' as const, label: 'Terms', href: '/terms' },
    { type: 'link' as const, label: 'Support', href: '/support' },
  ],
};

export const Default: Story = {
  args: {
    options: {
      copyright: '© 2026 MyApp. All rights reserved.',
    },
  },
};

export const WithNav: Story = {
  args: {
    options: {
      copyright: '© 2026 MyApp',
      navbar: FOOTER_NAV,
    },
  },
};

export const WithBrandAndNav: Story = {
  args: {
    options: {
      brand: { text: 'MyApp', href: '/' },
      copyright: '© 2026 MyApp',
      navbar: FOOTER_NAV,
      menuPosition: 'right',
    },
  },
};

export const MenuLeft: Story = {
  args: {
    options: {
      copyright: '© 2026 MyApp',
      navbar: FOOTER_NAV,
      menuPosition: 'left',
    },
  },
};

export const Colored: Story = {
  args: {
    options: {
      bgColor: 'dark',
      footerClass: 'text-light',
      copyright: '© 2026 MyApp',
      navbar: FOOTER_NAV,
    },
  },
};
