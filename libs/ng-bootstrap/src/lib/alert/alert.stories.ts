import { Component, ViewChild } from '@angular/core';
import { type Meta, type StoryObj } from '@storybook/angular';
import { AlertComponent } from './alert.component';
import { ButtonComponent } from '../button/button.component';

/** Wrapper that exposes the imperative AlertComponent API via clickable triggers */
@Component({
  selector: 'rnf-alert-demo',
  standalone: true,
  imports: [AlertComponent, ButtonComponent],
  template: `
    <div class="d-flex flex-wrap gap-2 mb-3">
      <rnf-button
        [label]="'Success'"
        [class]="'success'"
        (buttonClick)="alert.success('Operation completed successfully.')" />
      <rnf-button
        [label]="'Info'"
        [class]="'info'"
        (buttonClick)="alert.info('Here is some useful information.')" />
      <rnf-button
        [label]="'Warning'"
        [class]="'warning'"
        (buttonClick)="alert.warning('Please review before continuing.')" />
      <rnf-button
        [label]="'Error'"
        [class]="'danger'"
        (buttonClick)="
          alert.error('Something went wrong. Please try again.')
        " />
    </div>
    <rnf-alert #alert />
  `,
})
class AlertDemoComponent {
  @ViewChild('alert') alert!: AlertComponent;
}

const meta: Meta<AlertDemoComponent> = {
  title: 'Components/Alert',
  component: AlertDemoComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
\`AlertComponent\` has an imperative API — call \`success()\`, \`info()\`, \`warning()\`, or \`error()\`
on a \`@ViewChild\` reference to show a dismissible alert. Use \`start()\` / \`stop()\` for
progress-bar style loading feedback.

\`\`\`ts
@ViewChild('alert') alert!: AlertComponent;

this.alert.success('Saved successfully.');
this.alert.error('Something went wrong.');

// Loading state with progress bar
this.alert.start('Saving...');
this.service.save().subscribe(() => this.alert.stop('success', 'Saved!'));
\`\`\`
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<AlertDemoComponent>;

export const Interactive: Story = {};

export const AutoHide: Story = {
  render: () => ({
    template: `
      <p class="text-muted mb-2">Alert auto-dismisses after 3 seconds.</p>
      <rnf-button [label]="'Show alert'" [class]="'primary'" (buttonClick)="alert.success('Auto-hides in 3s')"/>
      <rnf-alert #alert [options]="{ autoHide: 3000 }"/>
    `,
    moduleMetadata: { imports: [AlertComponent, ButtonComponent] },
  }),
};
