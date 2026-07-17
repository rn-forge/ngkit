import { Component, TemplateRef, ViewChild } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { Offcanvas } from './offcanvas';
import { ButtonComponent } from '@rn-forge/ng-bootstrap';

@Component({
  selector: 'rnf-offcanvas-demo',
  standalone: true,
  imports: [Offcanvas, ButtonComponent],
  template: `
    <ng-template #content>
      <p>Offcanvas content goes here.</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
    </ng-template>
    <rnf-offcanvas [options]="options" [template]="content" />
  `,
})
class OffcanvasDemoComponent {
  @ViewChild('content') content!: TemplateRef<unknown>;
  options = {
    id: 'demo-offcanvas',
    direction: 'start' as const,
    header: { title: 'Navigation' },
    toggler: {
      button: { label: 'Open Menu', style: 'primary' as const },
    },
  };
}

const meta: Meta<OffcanvasDemoComponent> = {
  title: 'Shell/Offcanvas',
  component: OffcanvasDemoComponent,
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
\`Offcanvas\` renders a Bootstrap offcanvas panel with a configurable toggler button.
The panel direction, header title, and body content are all configurable.
Typically used inside \`Navbar\` to provide the mobile menu drawer.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<OffcanvasDemoComponent>;

export const StartPanel: Story = {};

export const EndPanel: Story = {
  render: () => ({
    props: {},
    template: `
      <ng-template #content>
        <p>Panel slides in from the right.</p>
      </ng-template>
      <rnf-offcanvas
        [options]="{
          id: 'end-offcanvas',
          direction: 'end',
          header: { title: 'Settings' },
          toggler: { button: { label: 'Open Settings', style: 'secondary' } }
        }"
        [template]="content" />
    `,
    moduleMetadata: { imports: [Offcanvas, ButtonComponent] },
  }),
};
