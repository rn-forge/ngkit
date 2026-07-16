import { type Meta, type StoryObj } from '@storybook/angular';
import { ErrorComponent } from './error.component';

const meta: Meta<ErrorComponent> = {
  title: 'Components/Error',
  component: ErrorComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
\`ErrorComponent\` renders a full-page error state driven entirely by its \`options\` config.
Pass \`code\`, \`message\`, and optional \`support\`/\`home\` links via the \`[options]\` input.

\`\`\`html
<rnf-error [options]="{ code: 404 }"/>
\`\`\`
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<ErrorComponent>;

export const NotFound: Story = {
  args: { options: { code: 404 } },
};

export const Forbidden: Story = {
  args: { options: { code: 403 } },
};

export const ServerError: Story = {
  args: { options: { code: 500 } },
};

export const Unauthorized: Story = {
  args: { options: { code: 401 } },
};

export const CustomMessage: Story = {
  args: {
    options: {
      code: 404,
      message: 'The report you requested no longer exists.',
      home: { label: 'Back to Dashboard', url: '/' },
      support: { label: 'Contact Helpdesk', url: 'mailto:help@example.com' },
    },
  },
};
