import { type Meta, type StoryObj } from '@storybook/angular';
import { RnfButton } from './button.component';

const variants = ['secondary', 'primary', 'accent', 'ghost', 'danger'] as const;
const shapes = ['default', 'pill'] as const;
const sizes = ['md', 'sm'] as const;

const meta: Meta<RnfButton> = {
  title: 'Components/Button',
  component: RnfButton,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: variants },
    shape: { control: 'select', options: shapes },
    size: { control: 'select', options: sizes },
    disabled: { control: 'boolean' },
    busy: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<RnfButton>;

/** One row per variant, one column per size and shape, for the given element and state. */
function grid(tag: 'button' | 'a', state = ''): string {
  const element = tag === 'a' ? 'a href="#"' : 'button type="button"';
  const rows = variants
    .map((variant) => {
      const cells = sizes
        .flatMap((size) =>
          shapes.map(
            (shape) =>
              `<${element} rnfButton variant="${variant}" shape="${shape}" size="${size}" ${state}>${variant}</${tag}>`,
          ),
        )
        .join('');
      return `<div style="display:flex;gap:0.75rem;align-items:center;margin-block-end:0.75rem">${cells}</div>`;
    })
    .join('');
  return `<div style="background-color:var(--rnf-surface-0);color:var(--rnf-text);padding:1rem;color-scheme:light dark">${rows}</div>`;
}

const story = (tag: 'button' | 'a', state = ''): Story => ({
  render: () => ({ template: grid(tag, state) }),
});

export const Default: Story = {
  args: { variant: 'secondary', shape: 'default', size: 'md' },
  render: (args) => ({
    props: args,
    template: `<button rnfButton [variant]="variant" [shape]="shape" [size]="size" [disabled]="disabled" [busy]="busy">Button</button>`,
  }),
};

export const Buttons: Story = story('button');
export const ButtonsDisabled: Story = story('button', 'disabled');
export const ButtonsBusy: Story = story('button', 'busy');
export const Links: Story = story('a');
export const LinksDisabled: Story = story('a', 'disabled');
export const LinksBusy: Story = story('a', 'busy');
