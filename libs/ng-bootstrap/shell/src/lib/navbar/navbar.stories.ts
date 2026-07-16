import { provideRouter } from '@angular/router';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { Navbar } from './navbar';

const meta: Meta<Navbar> = {
  title: 'Shell/Navbar',
  component: Navbar,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideRouter([])],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
\`Navbar\` is a pure renderer — it renders items from \`NavbarOptions.items\` without
permission filtering. Filter items via a computed signal in the parent before passing them in.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Navbar>;

const NAV_ITEMS = [
  { type: 'link' as const, label: 'Home', href: '/' },
  { type: 'link' as const, label: 'About', href: '/about' },
  { type: 'link' as const, label: 'Contact', href: '/contact' },
];

export const HeaderNav: Story = {
  args: {
    options: {
      type: 'header',
      breakpoint: 'lg',
      items: NAV_ITEMS,
    },
  },
};

export const FooterNav: Story = {
  args: {
    options: {
      type: 'footer',
      items: NAV_ITEMS,
    },
  },
};

export const WithSubmenu: Story = {
  args: {
    options: {
      type: 'header',
      breakpoint: 'lg',
      items: [
        { type: 'link' as const, label: 'Home', href: '/' },
        {
          type: 'submenu' as const,
          label: 'Products',
          submenu: {
            type: 'dropdown',
            items: [
              {
                type: 'link' as const,
                label: 'Product A',
                href: '/products/a',
              },
              {
                type: 'link' as const,
                label: 'Product B',
                href: '/products/b',
              },
              { type: 'divider' as const },
              {
                type: 'link' as const,
                label: 'All Products',
                href: '/products',
              },
            ],
          },
        },
        { type: 'link' as const, label: 'Contact', href: '/contact' },
      ],
    },
  },
};

export const WithColorMode: Story = {
  args: {
    options: {
      type: 'header',
      breakpoint: 'lg',
      items: [
        { type: 'link' as const, label: 'Home', href: '/' },
        { type: 'color-mode' as const },
      ],
    },
  },
};

export const WithDividers: Story = {
  args: {
    options: {
      type: 'header',
      breakpoint: 'lg',
      useDivider: true,
      items: NAV_ITEMS,
    },
  },
};
