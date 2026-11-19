import { Component, signal } from '@angular/core';
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
});

@Component({
  standalone: true,
  imports: [MultiTypeaheadFieldComponent, ReactiveFormsModule],
  template:
    '<rnf-multi-typeahead-field name="tags" [formGroup]="fg" [values]="values" [type]="fieldType()" [itemFilter]="itemFilter()" [itemFormatter]="itemFormatter()" />',
})
class HostComponent {
  initial: unknown[] = ['alpha'];
  fg = new FormGroup({ tags: new FormControl<unknown>(this.initial) });
  values = ['alpha', 'beta', 'gamma'];
  fieldType = signal<string | undefined>(undefined);
  itemFilter = signal<((i: string, c: any) => unknown[]) | undefined>(
    undefined,
  );
  itemFormatter = signal<((i: unknown, c: any) => string) | undefined>(
    undefined,
  );
}

describe('MultiTypeaheadFieldComponent inside a reactive form', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const el = () => fixture.nativeElement as HTMLElement;
  const input = () => el().querySelector('input') as HTMLInputElement;
  const options = () =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('li button'));
  const chips = () => Array.from(el().querySelectorAll('.badge'));
  const chipTexts = () => chips().map((c) => c.textContent?.trim());
  const closeButtons = () =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('.badge .btn-close'));
  const control = () => host.fg.controls.tags;
  const optionTexts = () => options().map((b) => b.textContent?.trim());
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

  it('renders chips for the initial control value', () => {
    expect(chipTexts()).toEqual(['alpha']);
  });

  it('typing filters the options by the typed text', () => {
    type('be');
    expect(optionTexts()).toEqual(['beta']);
  });

  it('typing does not write to the parent control', () => {
    type('be');
    expect(control().value).toEqual(['alpha']);
  });

  it('choosing writes a new array to the control', () => {
    type('be');
    choose('beta');
    expect(control().value).toEqual(['alpha', 'beta']);
    expect(control().dirty).toBe(true);
    expect(input().value).toBe('');
    expect(options().length).toBe(0);
    expect(chipTexts()).toEqual(['alpha', 'beta']);
  });

  it("selecting and removing never mutate the caller's array", () => {
    type('be');
    choose('beta');
    closeButtons()[0].click();
    fixture.detectChanges();
    expect(host.initial).toEqual(['alpha']);
    expect(control().value).not.toBe(host.initial);
  });

  it('a parent setValue updates the chips', () => {
    control().setValue(['gamma']);
    fixture.detectChanges();
    expect(chipTexts()).toEqual(['gamma']);
  });

  it('a parent reset clears the chips and the typed text', () => {
    type('be');
    expect(input().value).toBe('be');
    host.fg.reset();
    fixture.detectChanges();
    expect(chips().length).toBe(0);
    expect(input().value).toBe('');
    expect(options().length).toBe(0);
  });

  it('removing a chip writes the remaining array', () => {
    control().setValue(['alpha', 'beta']);
    fixture.detectChanges();
    closeButtons()[0].click();
    fixture.detectChanges();
    expect(control().value).toEqual(['beta']);
    expect(chipTexts()).toEqual(['beta']);
  });

  it('blur marks the parent control touched', () => {
    expect(control().touched).toBe(false);
    input().dispatchEvent(new Event('blur'));
    expect(control().touched).toBe(true);
  });

  it('disabling the control blocks typing, selecting and removing', () => {
    const cmp = fixture.debugElement.children[0]
      .componentInstance as MultiTypeaheadFieldComponent;
    control().disable();
    fixture.detectChanges();
    expect(input().disabled).toBe(true);
    expect(closeButtons().length).toBe(1);
    expect(closeButtons().every((b) => b.disabled)).toBe(true);
    type('be');
    expect(options().length).toBe(0);
    cmp.addValue('beta');
    cmp.removeValue('alpha');
    fixture.detectChanges();
    expect(control().value).toEqual(['alpha']);
    control().enable();
    fixture.detectChanges();
    expect(input().disabled).toBe(false);
    expect(closeButtons().every((b) => !b.disabled)).toBe(true);
  });

  it('passes the typed text to a custom itemFilter and uses itemFormatter', () => {
    const spy = vi.fn((_i: string) => ['beta']);
    host.itemFilter.set(spy);
    host.itemFormatter.set((v) => `<${String(v)}>`);
    fixture.detectChanges();
    type('Be');
    expect(spy).toHaveBeenCalledWith('Be', expect.anything());
    expect(optionTexts()).toEqual(['<beta>']);
    expect(chipTexts()).toEqual(['<alpha>']);
  });

  it('focusout does not clear an array when type is "string"', () => {
    host.fieldType.set('string');
    fixture.detectChanges();
    input().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();
    expect(control().value).toEqual(['alpha']);
  });

  it('keeps accessible labels', () => {
    expect(closeButtons().length).toBe(1);
    expect(closeButtons()[0].getAttribute('aria-label')).toBe('Remove');
    const label = el().querySelector('label');
    expect(label?.getAttribute('for')).toBe(input().id);
    expect(input().id).toBe('tags');
  });

  it('non-array control values render no chips', () => {
    for (const v of [null, '']) {
      expect(() => {
        control().setValue(v);
        fixture.detectChanges();
      }).not.toThrow();
      expect(chips().length).toBe(0);
    }
  });
});
