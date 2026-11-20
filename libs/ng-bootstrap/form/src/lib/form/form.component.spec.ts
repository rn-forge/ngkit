import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormComponent, FormOptions } from './form.component';

describe('FormComponent', () => {
  let component: FormComponent;
  let fixture: ComponentFixture<FormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormComponent],
    });
    fixture = TestBed.createComponent(FormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has configKey "form"', () => {
    expect(component.configKey).toBe('form');
  });

  it('is visible by default', () => {
    expect(component.disabled).toBe(false);
  });
});

@Component({
  standalone: true,
  imports: [FormComponent],
  template: `
    <rnf-form [options]="opts()" [template]="tpl" />
    <ng-template #tpl let-ctx
      ><span id="ctx">{{ ctx.label }}</span></ng-template
    >
  `,
})
class HostComponent {
  readonly opts = signal<Partial<FormOptions>>({});
  readonly form = viewChild.required(FormComponent);
}

describe('FormComponent configuration changes', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const set = (opts: Partial<FormOptions>) => {
    host.opts.set(opts);
    fixture.detectChanges();
  };
  const form = () => host.form();
  const text = (sel: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(sel)?.textContent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('applies a replaced group validator with the same control names', () => {
    const controls = { start: [''], end: [''] };
    set({ controls });
    const group = form().formGroup;
    set({ controls, validators: { validateDateRange: ['start', 'end'] } });
    form().controls['start'].setValue('2026-12-31');
    form().controls['end'].setValue('2026-01-01');
    expect(form().formGroup).toBe(group);
    expect(form().errors).toHaveProperty('dateRange');
    set({ controls });
    expect(form().errors).toBeNull();
  });

  it('renders changed context params with the same control names', () => {
    const controls = { a: [''] };
    set({ controls, contextParams: { label: 'one' } });
    expect(text('#ctx')).toBe('one');
    const group = form().formGroup;
    set({ controls, contextParams: { label: 'two' } });
    expect(text('#ctx')).toBe('two');
    expect(form().formGroup).toBe(group);
  });

  it('keeps edits, touched, dirty and disabled state on a cosmetic change', () => {
    const controls = { a: ['x'], b: ['y'] };
    set({ controls, disabledFields: ['b'], header: 'H1' });
    form().enable();
    const group = form().formGroup;
    form().controls['a'].setValue('edited');
    form().controls['a'].markAsDirty();
    form().controls['a'].markAsTouched();
    form().controls['b'].disable();
    set({ controls, disabledFields: ['b'], header: 'H2', classes: 'c' });
    expect(form().formGroup).toBe(group);
    expect(form().controls['a'].value).toBe('edited');
    expect(form().controls['a'].dirty).toBe(true);
    expect(form().controls['a'].touched).toBe(true);
    expect(form().controls['b'].disabled).toBe(true);
    expect(text('h5')).toBe('H2');
  });

  it('keeps a disabled form disabled on a cosmetic change', () => {
    const controls = { a: ['x'] };
    set({ controls, header: 'H1' });
    form().disable();
    set({ controls, header: 'H2' });
    expect(form().disabled).toBe(true);
  });

  it('keeps edits when only validators and context change', () => {
    const controls = { start: [''], end: [''] };
    set({ controls });
    const group = form().formGroup;
    form().controls['start'].setValue('edited');
    form().controls['start'].markAsDirty();
    form().controls['start'].markAsTouched();
    set({
      controls,
      validators: { validateDateRange: ['start', 'end'] },
      contextParams: { label: 'new' },
    });
    expect(form().formGroup).toBe(group);
    expect(form().controls['start'].value).toBe('edited');
    expect(form().controls['start'].dirty).toBe(true);
    expect(form().controls['start'].touched).toBe(true);
  });

  it('does not re-apply an unchanged options object', () => {
    const make = (): Partial<FormOptions> => ({
      controls: { start: [''], end: [''] },
      validators: { validateDateRange: ['start', 'end'] },
      contextParams: { label: 'one' },
    });
    set(make());
    const group = form().formGroup;
    const context = form().context;
    const setValidators = vi.spyOn(group, 'setValidators');
    const update = vi.spyOn(group, 'updateValueAndValidity');
    set(make());
    fixture.detectChanges();
    fixture.detectChanges();
    expect(setValidators).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(form().context).toBe(context);
  });

  it('rebuilds the group and resets values when a control is added, removed or renamed', () => {
    set({ controls: { a: ['x'] } });
    form().controls['a'].setValue('edited');
    form().controls['a'].markAsDirty();
    let group = form().formGroup;
    set({ controls: { a: ['x'], b: ['y'] } });
    expect(form().formGroup).not.toBe(group);
    expect(Object.keys(form().controls).sort()).toEqual(['a', 'b']);
    expect(form().controls['a'].value).toBe('x');
    expect(form().formGroup.pristine).toBe(true);
    group = form().formGroup;
    set({ controls: { b: ['y'] } });
    expect(form().formGroup).not.toBe(group);
    expect(Object.keys(form().controls)).toEqual(['b']);
    group = form().formGroup;
    set({ controls: { c: ['y'] } });
    expect(form().formGroup).not.toBe(group);
    expect(Object.keys(form().controls)).toEqual(['c']);
  });

  it('does not rebuild when the names are only reordered', () => {
    set({ controls: { z: ['1'], y: ['2'] } });
    const group = form().formGroup;
    form().controls['z'].setValue('edited');
    set({ controls: { y: ['2'], z: ['1'] } });
    expect(form().formGroup).toBe(group);
    expect(form().controls['z'].value).toBe('edited');
  });

  it('keeps the control and its value when a same-name definition changes', () => {
    set({ controls: { c: ['2'] } });
    const group = form().formGroup;
    set({ controls: { c: [5] } });
    expect(form().formGroup).toBe(group);
    expect(form().controls['c'].value).toBe('2');
  });

  it('rebuilds when names containing a comma change to separate names', () => {
    set({ controls: { 'a,b': [''] } });
    let group = form().formGroup;
    set({ controls: { a: [''], b: [''] } });
    expect(form().formGroup).not.toBe(group);
    expect(Object.keys(form().controls).sort()).toEqual(['a', 'b']);
    group = form().formGroup;
    set({ controls: { 'a,b': [''] } });
    expect(form().formGroup).not.toBe(group);
    expect(Object.keys(form().controls)).toEqual(['a,b']);
  });

  it('resolves a control name containing a dot', () => {
    set({ controls: { 'a.b': ['x'] }, header: 'H1' });
    const group = form().formGroup;
    expect(form().controls['a.b'].value).toBe('x');
    set({ controls: { 'a.b': ['x'] }, header: 'H2' });
    expect(form().formGroup).toBe(group);
    set({ controls: { 'a.c': ['x'] } });
    expect(form().formGroup).not.toBe(group);
  });
});
