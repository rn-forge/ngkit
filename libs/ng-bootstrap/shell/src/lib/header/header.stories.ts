import { provideRouter } from '@angular/router';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { HeaderComponent } from './header.component';
import { provideRnForgeShellConfig } from '../shell.config';

const meta: Meta<HeaderComponent> = {
  title: 'Shell/Header',
  component: HeaderComponent,
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
\`HeaderComponent\` renders a responsive Bootstrap navbar header with optional brand,
watermark, and nav items. Configure via \`provideRnForgeShellConfig\` or the \`[options]\` input.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<HeaderComponent>;

const BASE_NAVBAR = {
  type: 'header' as const,
  breakpoint: 'lg' as const,
  items: [
    { type: 'link' as const, label: 'Home', href: '/' },
    { type: 'link' as const, label: 'About', href: '/about' },
    { type: 'link' as const, label: 'Contact', href: '/contact' },
  ],
};

export const Default: Story = {
  args: {
    options: {
      navbar: BASE_NAVBAR,
    },
  },
};

export const WithBrand: Story = {
  args: {
    options: {
      navbar: BASE_NAVBAR,
      brand: {
        text: 'MyApp',
        href: '/',
      },
    },
  },
};

export const BrandCenter: Story = {
  args: {
    options: {
      navbar: BASE_NAVBAR,
      brand: { text: 'MyApp', href: '/' },
      position: { brand: 'center', menu: 'right' },
    },
  },
};

export const ColoredNavbar: Story = {
  args: {
    options: {
      navbarColor: 'primary',
      navbar: {
        ...BASE_NAVBAR,
        items: [...BASE_NAVBAR.items, { type: 'color-mode' as const }],
      },
      brand: { text: 'MyApp', href: '/' },
    },
  },
};

export const WithWatermark: Story = {
  args: {
    options: {
      navbar: BASE_NAVBAR,
      brand: { text: 'MyApp', href: '/' },
      watermark: {
        text: 'BETA',
        class: 'text-warning fw-bold',
      },
    },
  },
};
