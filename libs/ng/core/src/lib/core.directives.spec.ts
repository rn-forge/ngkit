import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HtmlAttributesDirective } from './core.directives';

// ---------------------------------------------------------------------------
// Host component
// ---------------------------------------------------------------------------

@Component({
  standalone: true,
  imports: [HtmlAttributesDirective],
  template: `<div [rnfHtmlAttributes]="attrs()"></div>`,
})
class HostComponent {
  attrs = signal<Record<string, string> | null>({});
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
    component.attrs.set({ 'data-id': '42' });
    fixture.detectChanges();
    expect(div().getAttribute('data-id')).toBe('42');
  });

  it('sets multiple attributes on the host element', () => {
    component.attrs.set({
      'aria-label': 'Close',
      role: 'button',
      'data-testid': 'close-btn',
    });
    fixture.detectChanges();
    expect(div().getAttribute('aria-label')).toBe('Close');
    expect(div().getAttribute('role')).toBe('button');
    expect(div().getAttribute('data-testid')).toBe('close-btn');
  });

  it('sets aria-* attributes correctly', () => {
    component.attrs.set({ 'aria-hidden': 'true', 'aria-expanded': 'false' });
    fixture.detectChanges();
    expect(div().getAttribute('aria-hidden')).toBe('true');
    expect(div().getAttribute('aria-expanded')).toBe('false');
  });

  it('sets data-* attributes correctly', () => {
    component.attrs.set({ 'data-user-id': 'usr-99' });
    fixture.detectChanges();
    expect(div().getAttribute('data-user-id')).toBe('usr-99');
  });

  it('applies no attributes when the map is empty', () => {
    component.attrs.set({});
    fixture.detectChanges();
    // The div should exist but have no extra attributes from the directive
    expect(div()).not.toBeNull();
    expect(div().getAttribute('data-id')).toBeNull();
  });

  it('updates changed attribute values on later change detection', () => {
    component.attrs.set({ 'data-id': '1' });
    fixture.detectChanges();
    component.attrs.set({ 'data-id': '2' });
    fixture.detectChanges();
    expect(div().getAttribute('data-id')).toBe('2');
  });

  it('removes attributes absent from the next map, keeping others', () => {
    component.attrs.set({ 'aria-label': 'Close', 'aria-hidden': 'true' });
    fixture.detectChanges();
    component.attrs.set({ 'aria-label': 'Close' });
    fixture.detectChanges();
    expect(div().getAttribute('aria-label')).toBe('Close');
    expect(div().hasAttribute('aria-hidden')).toBe(false);
  });

  it('removes all applied attributes when the map becomes empty or null', () => {
    component.attrs.set({ 'data-id': '1' });
    fixture.detectChanges();
    component.attrs.set(null);
    fixture.detectChanges();
    expect(div().hasAttribute('data-id')).toBe(false);
  });

  it('does not remove attributes it did not set', () => {
    component.attrs.set({ 'data-id': '1' });
    fixture.detectChanges();
    div().setAttribute('data-other', 'x');
    component.attrs.set({ 'data-id': '2' });
    fixture.detectChanges();
    expect(div().getAttribute('data-other')).toBe('x');
  });
});
