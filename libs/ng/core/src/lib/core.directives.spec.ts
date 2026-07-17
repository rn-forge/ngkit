import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HtmlAttributesDirective } from './core.directives';

// ---------------------------------------------------------------------------
// Host component
// ---------------------------------------------------------------------------

@Component({
  standalone: true,
  imports: [HtmlAttributesDirective],
  template: `<div [rnfHtmlAttributes]="attrs"></div>`,
})
class HostComponent {
  attrs: Record<string, string> = {};
}

// ---------------------------------------------------------------------------
// HtmlAttributesDirective
// ---------------------------------------------------------------------------

describe('HtmlAttributesDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let component: HostComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    });
    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  function div(): HTMLDivElement {
    return fixture.nativeElement.querySelector('div') as HTMLDivElement;
  }

  it('sets a single attribute on the host element', () => {
    component.attrs = { 'data-id': '42' };
    fixture.detectChanges();
    expect(div().getAttribute('data-id')).toBe('42');
  });

  it('sets multiple attributes on the host element', () => {
    component.attrs = {
      'aria-label': 'Close',
      role: 'button',
      'data-testid': 'close-btn',
    };
    fixture.detectChanges();
    expect(div().getAttribute('aria-label')).toBe('Close');
    expect(div().getAttribute('role')).toBe('button');
    expect(div().getAttribute('data-testid')).toBe('close-btn');
  });

  it('sets aria-* attributes correctly', () => {
    component.attrs = { 'aria-hidden': 'true', 'aria-expanded': 'false' };
    fixture.detectChanges();
    expect(div().getAttribute('aria-hidden')).toBe('true');
    expect(div().getAttribute('aria-expanded')).toBe('false');
  });

  it('sets data-* attributes correctly', () => {
    component.attrs = { 'data-user-id': 'usr-99' };
    fixture.detectChanges();
    expect(div().getAttribute('data-user-id')).toBe('usr-99');
  });

  it('applies no attributes when the map is empty', () => {
    component.attrs = {};
    fixture.detectChanges();
    // The div should exist but have no extra attributes from the directive
    expect(div()).not.toBeNull();
    expect(div().getAttribute('data-id')).toBeNull();
  });

  it('attributes are applied only once on ngOnInit, not re-applied on subsequent change detection', () => {
    component.attrs = { 'data-id': '1' };
    fixture.detectChanges(); // ngOnInit fires here

    // Changing the bound value after init should NOT update the DOM
    // (the directive only reads attrs in ngOnInit)
    component.attrs = { 'data-id': '2' };
    fixture.detectChanges();
    expect(div().getAttribute('data-id')).toBe('1');
  });
});
