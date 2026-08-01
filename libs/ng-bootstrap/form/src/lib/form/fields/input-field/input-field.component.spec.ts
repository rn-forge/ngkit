import { FormControl, FormGroup } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InputFieldComponent } from './input-field.component';

describe('InputFieldComponent', () => {
  let component: InputFieldComponent;
  let fixture: ComponentFixture<InputFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputFieldComponent],
    });
    fixture = TestBed.createComponent(InputFieldComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', 'email');
    fixture.componentRef.setInput(
      'formGroup',
      new FormGroup({ email: new FormControl('') }),
    );
    // ngOnInit (where htmlAttributes are resolved) only runs once, on the
    // first detectChanges — so type/htmlAttributes inputs must be set
    // *before* it, not afterwards.
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('type input defaults to "text"', () => {
    fixture.detectChanges();
    expect(component.type()).toBe('text');
  });

  it('icon input defaults to empty string', () => {
    fixture.detectChanges();
    expect(component.icon()).toBe('');
  });

  describe('ngOnInit attribute resolution', () => {
    it('defaults min/step for a number field', () => {
      fixture.componentRef.setInput('type', 'number');
      fixture.detectChanges();
      expect(component.resolvedAttributes()).toMatchObject({
        min: '0.01',
        step: '0.01',
      });
    });

    it('does not override an explicit min/step for a number field', () => {
      fixture.componentRef.setInput('type', 'number');
      fixture.componentRef.setInput('htmlAttributes', {
        min: '1',
        step: '5',
      });
      fixture.detectChanges();
      expect(component.resolvedAttributes()).toMatchObject({
        min: '1',
        step: '5',
      });
    });

    it('leaves already-formatted ISO min/max dates untouched', () => {
      fixture.componentRef.setInput('type', 'date');
      fixture.componentRef.setInput('htmlAttributes', {
        min: '2024-01-01',
        max: '2024-12-31',
      });
      fixture.detectChanges();
      expect(component.resolvedAttributes()).toMatchObject({
        min: '2024-01-01',
        max: '2024-12-31',
      });
    });

    it('resolves relative min/max dates to ISO dates', () => {
      fixture.componentRef.setInput('type', 'date');
      fixture.componentRef.setInput('htmlAttributes', {
        min: '-1',
        max: '1',
      });
      fixture.detectChanges();
      const attrs = component.resolvedAttributes();
      expect(attrs['min']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(attrs['max']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('defaults accept for a file field', () => {
      fixture.componentRef.setInput('type', 'file');
      fixture.detectChanges();
      expect(component.resolvedAttributes()).toMatchObject({
        accept: '*/*',
      });
    });
  });

  describe('checkValidation', () => {
    it('returns an empty string when the field has no matching control', () => {
      fixture.detectChanges();
      // Change the signal without re-running change detection, so the
      // [formControlName] directive (which requires the control to exist)
      // never re-binds against the now-missing control name.
      fixture.componentRef.setInput('name', 'missing');
      expect(component.checkValidation()).toBe('');
    });
  });
});
