import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

@Component({
  standalone: true,
  imports: [ModalComponent],
  template: `
    <ng-template #body>Modal content</ng-template>
    <rnf-modal [bodyTemplate]="body"></rnf-modal>
  `,
})
class ModalHost {
  @ViewChild(ModalComponent) modal!: ModalComponent;
  @ViewChild('body') body!: TemplateRef<unknown>;
}

describe('ModalComponent', () => {
  let fixture: ComponentFixture<ModalHost>;
  let component: ModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalHost],
    });
    fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();
    component = fixture.componentInstance.modal;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('hasOpenModals() returns false before any modal is opened', () => {
    expect(component.hasOpenModals()).toBe(false);
  });

  it('dismissAll() does not throw when no modals are open', () => {
    expect(() => component.dismissAll('test')).not.toThrow();
  });

  it('has configKey "modal"', () => {
    expect(component.configKey).toBe('modal');
  });
});
