import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Offcanvas } from './offcanvas';

@Component({
  standalone: true,
  imports: [Offcanvas],
  template: `
    <ng-template #panel>Panel content</ng-template>
    <rnf-offcanvas [template]="panel"></rnf-offcanvas>
  `,
})
class OffcanvasHost {
  @ViewChild(Offcanvas) offcanvas!: Offcanvas;
  @ViewChild('panel') panel!: TemplateRef<unknown>;
}

describe('Offcanvas', () => {
  let fixture: ComponentFixture<OffcanvasHost>;
  let component: Offcanvas;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffcanvasHost],
    });
    fixture = TestBed.createComponent(OffcanvasHost);
    fixture.detectChanges();
    component = fixture.componentInstance.offcanvas;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has configKey "offcanvas"', () => {
    expect(component.configKey).toBe('offcanvas');
  });
});
