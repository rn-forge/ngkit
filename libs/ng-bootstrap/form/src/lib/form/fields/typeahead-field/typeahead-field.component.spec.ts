import { FormControl, FormGroup } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TypeaheadFieldComponent } from './typeahead-field.component';

describe('TypeaheadFieldComponent', () => {
  let component: TypeaheadFieldComponent;
  let fixture: ComponentFixture<TypeaheadFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeaheadFieldComponent],
    });
    fixture = TestBed.createComponent(TypeaheadFieldComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', 'search');
    fixture.componentRef.setInput(
      'formGroup',
      new FormGroup({ search: new FormControl('') }),
    );
    fixture.componentRef.setInput('values', ['alpha', 'beta', 'gamma']);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('formatter() returns the string value for a string item', () => {
    expect(component.formatter('alpha')).toBe('alpha');
  });

  it('formatFields defaults to empty object', () => {
    expect(component.formatFields()).toEqual({});
  });

  describe('default formatter (formatterFn)', () => {
    it('returns an empty string for a falsy value', () => {
      expect(component.formatterFn()(undefined, component)).toBe('');
      expect(component.formatterFn()(0, component)).toBe('');
    });

    it('returns the value unchanged for a string', () => {
      expect(component.formatterFn()('alpha', component)).toBe('alpha');
    });

    it('joins resolved formatFields attributes for an object value', () => {
      fixture.componentRef.setInput('formatFields', {
        search: ['first', 'nested.last'],
      });
      fixture.detectChanges();
      const value = { first: 'Ada', nested: { last: 'Lovelace' } };
      expect(component.formatterFn()(value, component)).toBe('Ada - Lovelace');
    });

    it('resolves a missing nested attribute to an empty string', () => {
      fixture.componentRef.setInput('formatFields', {
        search: ['nested.missing'],
      });
      fixture.detectChanges();
      expect(component.formatterFn()({ nested: {} }, component)).toBe('');
    });

    it('defaults to the "name" attribute when no formatFields entry matches', () => {
      expect(component.formatterFn()({ name: 'Widget' }, component)).toBe(
        'Widget',
      );
    });
  });

  describe('default filter (filterFn)', () => {
    it('returns every value for an empty search input', () => {
      expect(component.filterFn()('', component)).toEqual([
        'alpha',
        'beta',
        'gamma',
      ]);
    });

    it('filters values whose formatted text contains the input, case-insensitively', () => {
      expect(component.filterFn()('ET', component)).toEqual(['beta']);
    });
  });

  describe('onFocusOut', () => {
    it('clears the control when the input is empty', () => {
      component.formGroup().patchValue({ search: '' });
      component.onFocusOut(new FocusEvent('focusout'));
      expect(component.formGroup().value['search']).toBeNull();
    });

    it('clears the control when the value type is not "string" but the raw input is a string', () => {
      fixture.componentRef.setInput('type', 'object');
      fixture.detectChanges();
      component.formGroup().patchValue({ search: 'partial text' });
      component.onFocusOut(new FocusEvent('focusout'));
      expect(component.formGroup().value['search']).toBeNull();
    });

    it('clears the control when the string input does not match any known value', () => {
      fixture.componentRef.setInput('type', 'string');
      fixture.detectChanges();
      component.formGroup().patchValue({ search: 'not-a-value' });
      component.onFocusOut(new FocusEvent('focusout'));
      expect(component.formGroup().value['search']).toBeNull();
    });

    it('keeps the control when the string input matches a known value', () => {
      fixture.componentRef.setInput('type', 'string');
      fixture.detectChanges();
      component.formGroup().patchValue({ search: 'alpha' });
      component.onFocusOut(new FocusEvent('focusout'));
      expect(component.formGroup().value['search']).toBe('alpha');
    });
  });

  describe('onItemSelect', () => {
    it('does nothing when there is no selected entity', () => {
      const emitSpy = vi.spyOn(component.selectItem, 'emit');
      component.onItemSelect(
        undefined as unknown as Parameters<typeof component.onItemSelect>[0],
      );
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('patches the control and emits selectItem for a selected entity', () => {
      const emitSpy = vi.spyOn(component.selectItem, 'emit');
      component.onItemSelect({
        item: 'beta',
        preventDefault: () => undefined,
      } as unknown as Parameters<typeof component.onItemSelect>[0]);
      expect(component.formGroup().value['search']).toBe('beta');
      expect(emitSpy).toHaveBeenCalledWith('beta');
    });
  });
});
