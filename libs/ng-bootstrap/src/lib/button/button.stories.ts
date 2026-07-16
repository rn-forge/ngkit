import { type Meta, type StoryObj } from '@storybook/angular';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Components/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    class: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'success',
        'danger',
        'warning',
        'info',
        'light',
        'dark',
      ],
      description: 'Bootstrap colour variant',
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
    },
    outline: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    icon: {
      control: 'text',
      description: 'Bootstrap Icons class name (e.g. "check-circle")',
    },
    buttonClick: { action: 'buttonClick' },
  },
};

export default meta;
type Story = StoryObj<ButtonComponent>;

export const Primary: Story = {
  args: { label: 'Save', class: 'primary' },
};

export const Outline: Story = {
  args: { label: 'Cancel', class: 'secondary', outline: true },
};

export const WithIcon: Story = {
  args: { label: 'Delete', class: 'danger', icon: 'trash' },
};

export const IconOnly: Story = {
  args: { icon: 'plus-circle', class: 'primary' },
};

export const Disabled: Story = {
  args: { label: 'Submit', class: 'primary', disabled: true },
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="d-flex flex-wrap gap-2 p-3">
        <rnf-button [label]="'Primary'" [class]="'primary'"/>
        <rnf-button [label]="'Secondary'" [class]="'secondary'"/>
        <rnf-button [label]="'Success'" [class]="'success'"/>
        <rnf-button [label]="'Danger'" [class]="'danger'"/>
        <rnf-button [label]="'Warning'" [class]="'warning'"/>
        <rnf-button [label]="'Info'" [class]="'info'"/>
      </div>
      <div class="d-flex flex-wrap gap-2 p-3">
        <rnf-button [label]="'Primary'" [class]="'primary'" [outline]="true"/>
        <rnf-button [label]="'Secondary'" [class]="'secondary'" [outline]="true"/>
        <rnf-button [label]="'Success'" [class]="'success'" [outline]="true"/>
        <rnf-button [label]="'Danger'" [class]="'danger'" [outline]="true"/>
      </div>
    `,
    moduleMetadata: { imports: [ButtonComponent] },
  }),
};
