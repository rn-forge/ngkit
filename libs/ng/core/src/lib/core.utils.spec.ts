import { FormControl, FormGroup } from '@angular/forms';
import { DateUtil, FormUtil, ObjectUtil } from './core.utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fixed point in time used across all date tests. Noon UTC avoids day-boundary
 *  drift for UTC±12 environments. */
const FIXED = new Date('2025-06-15T12:00:00.000Z');

function dirtyControl(value: string): FormControl<string> {
  const c = new FormControl(value, { nonNullable: true });
  c.markAsDirty();
  return c;
}

// ---------------------------------------------------------------------------
// DateUtil
// ---------------------------------------------------------------------------

describe('DateUtil', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED);
  });

  afterEach(() => vi.useRealTimers());

  describe('today()', () => {
    it('returns the current date in YYYY-MM-DD', () => {
      // derive expected from the same local-time methods the implementation uses
      const y = FIXED.getFullYear();
      const m = String(FIXED.getMonth() + 1).padStart(2, '0');
      const d = String(FIXED.getDate()).padStart(2, '0');
      expect(DateUtil.today()).toBe(`${y}-${m}-${d}`);
    });
  });

  describe('monthStart()', () => {
    it('returns the first day of the current month', () => {
      const y = FIXED.getFullYear();
      const m = String(FIXED.getMonth() + 1).padStart(2, '0');
      expect(DateUtil.monthStart()).toBe(`${y}-${m}-01`);
    });
  });

  describe('isoFormat()', () => {
    it('formats a mid-year date correctly', () => {
      expect(DateUtil.isoFormat(new Date(2024, 6, 4))).toBe('2024-07-04');
    });

    it('pads single-digit month and day with zeros', () => {
      expect(DateUtil.isoFormat(new Date(2024, 0, 9))).toBe('2024-01-09');
    });
  });

  describe('fromTimestamp()', () => {
    it('converts a UTC millisecond timestamp to ISO date string', () => {
      const ts = Date.UTC(2024, 6, 4); // 2024-07-04 UTC
      expect(DateUtil.fromTimestamp(ts)).toBe('2024-07-04');
    });
  });

  describe('diffDate()', () => {
    it('adds positive days to today', () => {
      expect(DateUtil.diffDate('5')).toBe('2025-06-20');
    });

    it('subtracts negative days from today', () => {
      expect(DateUtil.diffDate('-10')).toBe('2025-06-05');
    });

    it('returns today for zero offset', () => {
      expect(DateUtil.diffDate('0')).toBe('2025-06-15');
    });
  });

  describe('isPast()', () => {
    it('returns true for yesterday', () =>
      expect(DateUtil.isPast('2025-06-14')).toBe(true));
    it('returns false for today', () =>
      expect(DateUtil.isPast('2025-06-15')).toBe(false));
    it('returns false for tomorrow', () =>
      expect(DateUtil.isPast('2025-06-16')).toBe(false));
  });

  describe('isFuture()', () => {
    it('returns true for tomorrow', () =>
      expect(DateUtil.isFuture('2025-06-16')).toBe(true));
    it('returns false for today', () =>
      expect(DateUtil.isFuture('2025-06-15')).toBe(false));
    it('returns false for yesterday', () =>
      expect(DateUtil.isFuture('2025-06-14')).toBe(false));
  });

  describe('isToday()', () => {
    it('returns true for today', () =>
      expect(DateUtil.isToday('2025-06-15')).toBe(true));
    it('returns false for yesterday', () =>
      expect(DateUtil.isToday('2025-06-14')).toBe(false));
    it('returns false for tomorrow', () =>
      expect(DateUtil.isToday('2025-06-16')).toBe(false));
  });

  describe('isBetween()', () => {
    it('returns true when date is within the range', () => {
      expect(DateUtil.isBetween('2025-06-15', '2025-06-10', '2025-06-20')).toBe(
        true,
      );
    });

    it('returns true when date equals start boundary', () => {
      expect(DateUtil.isBetween('2025-06-10', '2025-06-10', '2025-06-20')).toBe(
        true,
      );
    });

    it('returns true when date equals end boundary', () => {
      expect(DateUtil.isBetween('2025-06-20', '2025-06-10', '2025-06-20')).toBe(
        true,
      );
    });

    it('returns false when date is before range', () => {
      expect(DateUtil.isBetween('2025-06-09', '2025-06-10', '2025-06-20')).toBe(
        false,
      );
    });

    it('returns false when date is after range', () => {
      expect(DateUtil.isBetween('2025-06-21', '2025-06-10', '2025-06-20')).toBe(
        false,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// ObjectUtil
// ---------------------------------------------------------------------------

describe('ObjectUtil', () => {
  describe('setDefault()', () => {
    // setDefault<T extends object>: source type must match the value type exactly.

    it('sets the key when absent', () => {
      const obj: Record<string, { v: number }> = {};
      ObjectUtil.setDefault(obj, 'x', { v: 1 });
      expect(obj['x']).toEqual({ v: 1 });
    });

    it('returns the newly set value', () => {
      const obj: Record<string, { label: string }> = {};
      const result = ObjectUtil.setDefault(obj, 'x', { label: 'hello' });
      expect(result).toEqual({ label: 'hello' });
    });

    it('preserves an existing value and does not overwrite it', () => {
      const existing = { label: 'existing' };
      const obj: Record<string, { label: string }> = { x: existing };
      ObjectUtil.setDefault(obj, 'x', { label: 'new' });
      expect(obj['x']).toBe(existing);
    });

    it('sets the key when the current value is undefined', () => {
      const obj: Record<string, { label: string }> = {
        x: undefined as unknown as { label: string },
      };
      ObjectUtil.setDefault(obj, 'x', { label: 'fallback' });
      expect(obj['x']).toEqual({ label: 'fallback' });
    });
  });

  describe('diff()', () => {
    it('returns empty object for identical flat objects', () => {
      expect(ObjectUtil.diff({ a: 1 }, { a: 1 })).toEqual({});
    });

    it('reports keys present in target but absent in source as missing_in_source', () => {
      const result = ObjectUtil.diff({ a: 1 }, { a: 1, b: 2 });
      expect(result['missing_in_source']).toEqual({ b: 2 });
    });

    it('reports keys present in source but absent in target as missing_in_target', () => {
      const result = ObjectUtil.diff({ a: 1, b: 2 }, { a: 1 });
      expect(result['missing_in_target']).toEqual({ b: 2 });
    });

    it('reports conflicts for non-empty string values that differ', () => {
      const result = ObjectUtil.diff({ a: 'foo' }, { a: 'bar' });
      expect(result['conflicts']).toHaveProperty('a');
      const conflict = (result['conflicts'] as Record<string, unknown>)[
        'a'
      ] as unknown[];
      expect(conflict).toContain('foo');
      expect(conflict).toContain('bar');
    });

    it('does not report a conflict for numeric values (lodash isEmpty treats numbers as empty)', () => {
      // isEmpty(number) === true in lodash — primitives have no enumerable keys
      const result = ObjectUtil.diff({ a: 1 }, { a: 2 });
      expect(result).not.toHaveProperty('conflicts');
    });

    it('reports no conflict for identical non-empty string values', () => {
      const result = ObjectUtil.diff({ a: 'same' }, { a: 'same' });
      expect(result).not.toHaveProperty('conflicts');
    });

    it('recursively diffs nested objects and nests the result under conflicts', () => {
      const source = { nested: { x: 'same', y: 'old' } };
      const target = { nested: { x: 'same', y: 'new' } };
      const result = ObjectUtil.diff(source, target);
      const conflicts = result['conflicts'] as Record<string, unknown>;
      expect(conflicts).toHaveProperty('nested');
      const nestedDiff = conflicts['nested'] as Record<string, unknown>;
      expect(nestedDiff).toHaveProperty('conflicts');
    });

    it('returns missing_in_source for all keys when source is undefined', () => {
      const result = ObjectUtil.diff(undefined, { a: 1 });
      expect(result['missing_in_source']).toEqual({ a: 1 });
    });

    it('returns missing_in_target for all keys when target is undefined', () => {
      const result = ObjectUtil.diff({ a: 1 }, undefined);
      expect(result['missing_in_target']).toEqual({ a: 1 });
    });

    it('returns empty object when both source and target are undefined', () => {
      expect(ObjectUtil.diff(undefined, undefined)).toEqual({});
    });
  });
});

// ---------------------------------------------------------------------------
// FormUtil.VALIDATORS
// ---------------------------------------------------------------------------

describe('FormUtil.VALIDATORS', () => {
  // ---------------------------------------------------------------------------
  // TEXT
  // ---------------------------------------------------------------------------
  describe('TEXT', () => {
    it('returns null for a pristine control', () => {
      const control = new FormControl('hello');
      // pristine by default
      expect(FormUtil.VALIDATORS.TEXT()(control)).toBeNull();
    });

    it('returns null when the control has no value', () => {
      const control = dirtyControl('');
      expect(FormUtil.VALIDATORS.TEXT()(control)).toBeNull();
    });

    it('returns an error when value does not match the pattern', () => {
      const control = dirtyControl('abc123');
      const result = FormUtil.VALIDATORS.TEXT({ pattern: '^[a-z]+$' })(control);
      expect(result).toHaveProperty('error');
    });

    it('returns null when value matches the pattern', () => {
      const control = dirtyControl('abc');
      expect(
        FormUtil.VALIDATORS.TEXT({ pattern: '^[a-z]+$' })(control),
      ).toBeNull();
    });

    it('returns an error when value is shorter than minLength', () => {
      const control = dirtyControl('ab');
      const result = FormUtil.VALIDATORS.TEXT({ minLength: 5 })(control);
      expect(result).toHaveProperty('error');
    });

    it('returns null when value meets minLength', () => {
      const control = dirtyControl('abcde');
      expect(FormUtil.VALIDATORS.TEXT({ minLength: 5 })(control)).toBeNull();
    });

    it('returns an error when value exceeds maxLength', () => {
      const control = dirtyControl('abcdef');
      const result = FormUtil.VALIDATORS.TEXT({ maxLength: 5 })(control);
      expect(result).toHaveProperty('error');
    });

    it('returns an error when value length does not match exact length', () => {
      const control = dirtyControl('ab');
      const result = FormUtil.VALIDATORS.TEXT({ length: 5 })(control);
      expect(result).toHaveProperty('error');
    });

    it('returns null when value matches exact length', () => {
      const control = dirtyControl('abcde');
      expect(FormUtil.VALIDATORS.TEXT({ length: 5 })(control)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // NUMBER
  // ---------------------------------------------------------------------------
  describe('NUMBER', () => {
    it('returns null for a pristine control', () => {
      const control = new FormControl('42');
      expect(FormUtil.VALIDATORS.NUMBER()(control)).toBeNull();
    });

    it('returns an error for a non-numeric value', () => {
      const control = dirtyControl('abc');
      const result = FormUtil.VALIDATORS.NUMBER()(control);
      expect(result).toHaveProperty('error');
    });

    it('returns an error when value is below min', () => {
      const control = new FormControl(5, { nonNullable: true });
      control.markAsDirty();
      const result = FormUtil.VALIDATORS.NUMBER({ min: 10 })(control);
      expect(result).toHaveProperty('error');
    });

    it('returns null when value meets min', () => {
      const control = new FormControl(10, { nonNullable: true });
      control.markAsDirty();
      expect(FormUtil.VALIDATORS.NUMBER({ min: 10 })(control)).toBeNull();
    });

    it('returns an error when value exceeds max', () => {
      const control = new FormControl(101, { nonNullable: true });
      control.markAsDirty();
      const result = FormUtil.VALIDATORS.NUMBER({ max: 100 })(control);
      expect(result).toHaveProperty('error');
    });

    it('returns null when value is within max', () => {
      const control = new FormControl(99, { nonNullable: true });
      control.markAsDirty();
      expect(FormUtil.VALIDATORS.NUMBER({ max: 100 })(control)).toBeNull();
    });

    it('returns an error when decimal places exceed the limit', () => {
      const control = new FormControl(1.999, { nonNullable: true });
      control.markAsDirty();
      const result = FormUtil.VALIDATORS.NUMBER({ decimalPlaces: 2 })(control);
      expect(result).toHaveProperty('error');
    });

    it('returns null when decimal places are within the limit', () => {
      const control = new FormControl(1.99, { nonNullable: true });
      control.markAsDirty();
      expect(
        FormUtil.VALIDATORS.NUMBER({ decimalPlaces: 2 })(control),
      ).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // DATE
  // ---------------------------------------------------------------------------
  describe('DATE', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FIXED); // today = 2025-06-15
    });

    afterEach(() => vi.useRealTimers());

    it.each([
      ['a pristine control', () => new FormControl('2025-06-15')],
      ['a control with no value', () => dirtyControl('')],
      ['today regardless of allowPast', () => dirtyControl('2025-06-15')],
    ])('returns null for %s', (_desc, makeControl) => {
      expect(FormUtil.VALIDATORS.DATE()(makeControl())).toBeNull();
    });

    it('returns an error for an invalid date format', () => {
      const control = dirtyControl('15-06-2025');
      const result = FormUtil.VALIDATORS.DATE()(control);
      expect(result).toHaveProperty('error');
    });

    it('rejects past dates by default', () => {
      const control = dirtyControl('2025-06-14');
      const result = FormUtil.VALIDATORS.DATE()(control);
      expect(result).toHaveProperty('error');
    });

    it('allows past dates when allowPast is true', () => {
      const control = dirtyControl('2025-06-14');
      expect(FormUtil.VALIDATORS.DATE({ allowPast: true })(control)).toBeNull();
    });

    it('rejects future dates when disallowFuture is true', () => {
      const control = dirtyControl('2025-06-16');
      const result = FormUtil.VALIDATORS.DATE({ disallowFuture: true })(
        control,
      );
      expect(result).toHaveProperty('error');
    });

    it('allows future dates by default', () => {
      const control = dirtyControl('2025-06-16');
      expect(FormUtil.VALIDATORS.DATE()(control)).toBeNull();
    });

    it('returns an error when date is before notBefore (exact date)', () => {
      const control = dirtyControl('2025-06-15'); // today, notBefore is tomorrow
      const result = FormUtil.VALIDATORS.DATE({
        allowPast: true,
        notBefore: '2025-06-16',
      })(control);
      expect(result).toHaveProperty('error');
    });

    it('returns null when date meets the notBefore boundary', () => {
      const control = dirtyControl('2025-06-16');
      expect(
        FormUtil.VALIDATORS.DATE({ notBefore: '2025-06-16' })(control),
      ).toBeNull();
    });

    it('returns an error when date is after notAfter (exact date)', () => {
      const control = dirtyControl('2025-12-31');
      const result = FormUtil.VALIDATORS.DATE({ notAfter: '2025-06-30' })(
        control,
      );
      expect(result).toHaveProperty('error');
    });

    it('returns null when date meets the notAfter boundary', () => {
      const control = dirtyControl('2025-06-30');
      expect(
        FormUtil.VALIDATORS.DATE({ notAfter: '2025-06-30' })(control),
      ).toBeNull();
    });

    it('accepts notBefore as a day-offset string', () => {
      // today is 2025-06-15; offset '-5' → compareDate = 2025-06-10
      // date 2025-06-09 < 2025-06-10 → error
      const control = dirtyControl('2025-06-09');
      const result = FormUtil.VALIDATORS.DATE({
        allowPast: true,
        notBefore: '-5',
      })(control);
      expect(result).toHaveProperty('error');
    });
  });

  // ---------------------------------------------------------------------------
  // DATE_RANGE
  // ---------------------------------------------------------------------------
  describe('DATE_RANGE', () => {
    it('sets an error on startDate when start is moved after end', () => {
      const form = new FormGroup({
        startDate: new FormControl('2025-06-01'),
        endDate: new FormControl('2025-06-20'),
      });
      FormUtil.VALIDATORS.DATE_RANGE(form);

      form.controls['startDate'].setValue('2025-06-25');

      expect(form.controls['startDate'].errors).toEqual({
        error: 'Start date cannot be after end date',
      });
    });

    it('sets an error on endDate when end is moved before start', () => {
      const form = new FormGroup({
        startDate: new FormControl('2025-06-10'),
        endDate: new FormControl('2025-06-20'),
      });
      FormUtil.VALIDATORS.DATE_RANGE(form);

      form.controls['endDate'].setValue('2025-06-05');

      expect(form.controls['endDate'].errors).toEqual({
        error: 'End date cannot be before start date',
      });
    });

    it('clears endDate errors when start moves to before end', () => {
      const form = new FormGroup({
        startDate: new FormControl('2025-06-10'),
        endDate: new FormControl('2025-06-20'),
      });
      FormUtil.VALIDATORS.DATE_RANGE(form);
      form.controls['endDate'].setErrors({ error: 'pre-existing error' });

      form.controls['startDate'].setValue('2025-06-05');

      expect(form.controls['endDate'].errors).toBeNull();
    });

    it('clears startDate errors when end moves to after start', () => {
      const form = new FormGroup({
        startDate: new FormControl('2025-06-10'),
        endDate: new FormControl('2025-06-20'),
      });
      FormUtil.VALIDATORS.DATE_RANGE(form);
      form.controls['startDate'].setErrors({ error: 'pre-existing error' });

      form.controls['endDate'].setValue('2025-06-25');

      expect(form.controls['startDate'].errors).toBeNull();
    });

    it('does not set an error when endDate has no value', () => {
      const form = new FormGroup({
        startDate: new FormControl('2025-06-10'),
        endDate: new FormControl(''),
      });
      FormUtil.VALIDATORS.DATE_RANGE(form);

      form.controls['startDate'].setValue('2025-06-25');

      expect(form.controls['startDate'].errors).toBeNull();
    });

    it('uses custom control names when provided', () => {
      const form = new FormGroup({
        from: new FormControl('2025-06-01'),
        to: new FormControl('2025-06-20'),
      });
      FormUtil.VALIDATORS.DATE_RANGE(form, 'from', 'to');

      form.controls['from'].setValue('2025-06-25');

      expect(form.controls['from'].errors).toHaveProperty('error');
    });
  });
});
