import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultiTypeaheadFieldComponent } from './multi-typeahead-field.component';

describe('MultiTypeaheadFieldComponent', () => {
  let component: MultiTypeaheadFieldComponent;
  let fixture: ComponentFixture<MultiTypeaheadFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiTypeaheadFieldComponent],
    });
    fixture = TestBed.createComponent(MultiTypeaheadFieldComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', 'tags');
    fixture.componentRef.setInput(
      'formGroup',
      new FormGroup({ tags: new FormControl('') }),
    );
    fixture.componentRef.setInput('values', ['alpha', 'beta']);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('writeValue() sets the internal value without error', () => {
    expect(() => component.writeValue(['alpha'])).not.toThrow();
  });
});

@Component({
  standalone: true,
  imports: [MultiTypeaheadFieldComponent, ReactiveFormsModule],
  template:
    '<rnf-multi-typeahead-field name="tags" [formGroup]="fg" [values]="values" />',
})
class HostComponent {
  fg = new FormGroup({ tags: new FormControl<unknown>(null) });
  values = ['alpha', 'beta', 'gamma'];
}

describe('MultiTypeaheadFieldComponent inside a reactive form', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const el = () => fixture.nativeElement as HTMLElement;
  const input = () => el().querySelector('input') as HTMLInputElement;
  const options = () =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('li button'));
  const chips = () => Array.from(el().querySelectorAll('.badge'));
  const closeButtons = () =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('.btn-close'));
  const type = (text: string) => {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const choose = (label: string) => {
    options()
      .find((b) => b.textContent?.trim() === label)
      ?.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('typing opens the options list', () => {
    type('be');
    expect(options().length).toBeGreaterThan(0);
    expect(options().map((b) => b.textContent?.trim())).toContain('beta');
  });

  it('choosing an option shows it as a chip', () => {
    type('be');
    choose('beta');
    expect(chips().length).toBe(1);
    expect(chips()[0].textContent?.trim()).toBe('beta');
  });

  it('removing a chip drops it', () => {
    type('a');
    choose('alpha');
    type('a');
    choose('beta');
    expect(chips().length).toBe(2);
    closeButtons()[0].click();
    fixture.detectChanges();
    expect(chips().length).toBe(1);
  });

  it('blur marks the parent control touched', () => {
    expect(host.fg.controls.tags.touched).toBe(false);
    input().dispatchEvent(new Event('blur'));
    expect(host.fg.controls.tags.touched).toBe(true);
  });

  it('disabling the control disables the input', () => {
    host.fg.controls.tags.disable();
    fixture.detectChanges();
    expect(input().disabled).toBe(true);
    host.fg.controls.tags.enable();
    fixture.detectChanges();
    expect(input().disabled).toBe(false);
  });

  it('resetting the form clears the typed text', () => {
    type('be');
    expect(input().value).toBe('be');
    host.fg.reset();
    fixture.detectChanges();
    expect(input().value).toBe('');
  });
});
