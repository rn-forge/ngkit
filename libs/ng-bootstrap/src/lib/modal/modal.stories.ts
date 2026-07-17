import { Component, ViewChild } from '@angular/core';
import { type Meta, type StoryObj } from '@storybook/angular';
import { ModalComponent } from './modal.component';
import { type ModalOptions } from './modal.types';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'rnf-modal-demo',
  standalone: true,
  imports: [ModalComponent, ButtonComponent],
  template: `
    <ng-template #body>
      <p>
        This is the modal body content. Replace this template with any Angular
        content.
      </p>
    </ng-template>

    <rnf-button
      [label]="'Open Modal'"
      [class]="'primary'"
      (buttonClick)="modal.open()" />
    <rnf-modal #modal [bodyTemplate]="body" [options]="options" />
  `,
})
class ModalDemoComponent {
  @ViewChild('modal') modal!: ModalComponent;
  options: ModalOptions = {
    header: { text: 'Confirm Action', icon: 'exclamation-circle' },
    submitBtn: { label: 'Confirm', class: 'primary' },
    cancelBtn: 'Cancel',
  };
}

@Component({
  selector: 'rnf-modal-form-demo',
  standalone: true,
  imports: [ModalComponent, ButtonComponent],
  template: `
    <ng-template #body>
      <div class="mb-3">
        <label class="form-label" for="modal-demo-name">Name</label>
        <input
          id="modal-demo-name"
          type="text"
          class="form-control"
          placeholder="Enter name" />
      </div>
      <div class="mb-3">
        <label class="form-label" for="modal-demo-email">Email</label>
        <input
          id="modal-demo-email"
          type="email"
          class="form-control"
          placeholder="Enter email" />
      </div>
    </ng-template>

    <rnf-button
      [label]="'Add User'"
      [class]="'success'"
      [icon]="'plus'"
      (buttonClick)="modal.open()" />
    <rnf-modal #modal [bodyTemplate]="body" [options]="options" />
  `,
})
class ModalFormDemoComponent {
  @ViewChild('modal') modal!: ModalComponent;
  options: ModalOptions = {
    header: { text: 'Add User', icon: 'person-plus' },
    submitBtn: { label: 'Save', class: 'success' },
  };
}

const meta: Meta<ModalDemoComponent> = {
  title: 'Components/Modal',
  component: ModalDemoComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
\`ModalComponent\` wraps ng-bootstrap's modal service. Pass an \`ng-template\` as \`bodyTemplate\`
and call \`open()\` imperatively via \`@ViewChild\`.

\`\`\`ts
@ViewChild('modal') modal!: ModalComponent;

open() { this.modal.open(); }
\`\`\`
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<ModalDemoComponent>;

export const Confirm: Story = {};

export const WithForm: Story = {
  render: () => ({
    template: '<rnf-modal-form-demo/>',
    moduleMetadata: { imports: [ModalFormDemoComponent] },
  }),
};
