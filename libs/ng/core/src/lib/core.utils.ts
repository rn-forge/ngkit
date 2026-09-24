// external imports
import { signal, WritableSignal } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// internal imports
import { GenericType } from './core.types';

/**
 * Global signal tracking whether debug mode is active.
 * Enabled automatically when the `__DEBUG` query parameter is present in the URL.
 * Can be toggled at runtime via `DEBUG_MODE.set(true/false)`.
 */
export const DEBUG_MODE: WritableSignal<boolean> = signal(
  typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('__DEBUG'),
);

/** Returns the current value of the {@link DEBUG_MODE} signal. */
export function isDebugMode(): boolean {
  return DEBUG_MODE();
}

// global variables
const DAY_IN_MILLIS: number = 1000 * 60 * 60 * 24;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** General-purpose application utilities. */
export class AppUtil {
  // /**
  //  * Retrieves the user preference for a given key from local storage.
  //  * If the preference does not exist, the default value is returned.
  //  *
  //  * @param {string} key - The key of the user preference.
  //  * @param {string} defaultValue - The default value to return if the preference does not exist.
  //  *
  //  * @returns {string} The user preference value or the default value.
  //  */
  // static getLocalStorageItem(key: string, defaultValue = ''): string {
  //   return localStorage.getItem(key) ?? defaultValue;
  // }

  // /**
  //  * Sets the user preference for a given key in local storage.
  //  *
  //  * @param {string} key - The key of the user preference.
  //  * @param {string} value - The value to set for the user preference.
  //  */
  // static setLocalStorageItem(key: string, value: string) {
  //   localStorage.setItem(key, value);
  // }

  /**
   * Reads a `File` or `Blob` as a base64 data URL and passes the result to `handler`.
   * Useful for previewing image uploads before sending them to the server.
   *
   * @example
   * ```ts
   * AppUtil.readImage(file, (dataUrl) => this.previewSrc = dataUrl);
   * ```
   */
  static readImage(
    content: File | Blob,
    handler: (data: string) => void,
  ): void {
    const reader = new FileReader();
    reader.readAsDataURL(content);
    reader.onload = (e) => {
      handler(e.target?.result as string);
    };
  }

  /**
   * Triggers a browser download for an in-memory `Blob` by creating a
   * transient object URL, clicking a detached anchor and revoking the URL.
   * DOM glue only: callers decide the blob's content type and filename (for
   * example from a documented file response's `Content-Disposition` header).
   *
   * Hand-rolled, not wrapped around `file-saver`: checked on npm 2026-09-23,
   * `file-saver` 2.0.5 was last released 2020-11 and its repository last
   * pushed 2023-03, and the needed slice is a few lines of anchor and
   * object-URL glue (README exemption 3).
   */
  static saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

/** Utilities for working with plain objects. */
export class ObjectUtil {
  // /**
  //  * Merges multiple objects into a single object.
  //  *
  //  * @param {any} source - The source object to merge.
  //  * @param {any} overrides - The objects to override the source object.
  //  * @returns {any} The merged object.
  //  */
  // static mergeObjects<T>(source: T, ...overrides: T[]): T {
  //   const initial: T = Object.assign({}, source);
  //   return overrides.filter((o) => o).reduce((target, override) => {
  //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //     return Object.assign(target as object, Object.fromEntries(Object.entries(override as GenericType).filter(([k, v]) => v !== undefined))) as T;
  //   }, initial);
  // }

  // static deepMerge<T extends object>(source: T, ...overrides: T[]): T {
  //   const result = { ...source };

  //   overrides.forEach((override) => {
  //     for (const key in override) {
  //       const overrideValue = override[key];

  //       if (!(key in result) || Array.isArray(overrideValue)) {
  //         // directly carry over the value if it doesn't exist in the target or is an array
  //         result[key] = overrideValue;
  //         continue;
  //       }

  //       const sourceValue = result[key];
  //       if (typeof overrideValue === 'object' && typeof sourceValue === 'object') {
  //         // Recursively merge nested objects
  //         // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //         result[key] = AppUtil.deepMerge(sourceValue as any, overrideValue);
  //       } else {
  //         // Overwrite value with override
  //         result[key] = overrideValue;
  //       }
  //     }
  //   });

  //   return result;
  // }

  // static applyDefaults<T>(source: T, defaults: T): void {
  //   const target = source as GenericType;
  //   for (const key in defaults) {
  //     const defaultValue = defaults[key];

  //     if (!(key in target) || target[key] === undefined) {
  //       target[key] = defaultValue;
  //     }
  //   }
  // }

  /**
   * Returns `source[key]` if it exists and is not `undefined`; otherwise sets it to
   * `value` and returns that value. Mutates `source` in place.
   */
  static setDefault<T extends object>(
    source: GenericType<T>,
    key: string,
    value: T,
  ): T {
    if (!(key in source) || source[key] === undefined) {
      source[key] = value;
    }

    return source[key] as T;
  }

  /**
   * Deep-compares `source` and `target` and returns a diff object with three optional keys:
   * - `missing_in_source` — keys present in `target` but absent from `source`
   * - `missing_in_target` — keys present in `source` but absent from `target`
   * - `conflicts` — keys present in both with different values (nested objects are diffed recursively)
   *
   * Returns an empty object `{}` when the two objects are equivalent.
   */
  static diff<T extends object>(source?: T, target?: T): GenericType {
    const result = {};

    if (target) {
      for (const key in target) {
        ObjectUtil._diffTargetKey(result, key, target[key], source);
      }
    }

    if (source) {
      for (const key in source) {
        if (!(target && key in target)) {
          ObjectUtil.setDefault<GenericType>(result, 'missing_in_target', {})[
            key
          ] = source[key];
        }
      }
    }

    return result;
  }

  /** Compares a single `target` key against `source` and records the result into `result`. */
  private static _diffTargetKey<T extends object>(
    result: GenericType<GenericType>,
    key: string,
    targetValue: unknown,
    source?: T,
  ): void {
    if (!(source && key in source)) {
      // directly carry over the value if it doesn't exist in the source
      ObjectUtil.setDefault<GenericType>(result, 'missing_in_source', {})[key] =
        targetValue;
      return;
    }

    const sourceValue = (source as GenericType)[key];
    if (sourceValue == null && targetValue == null) {
      // null and undefined are considered equivalent
      return;
    }

    if (typeof sourceValue === 'function') {
      return;
    }

    if (
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      sourceValue !== null &&
      targetValue !== null &&
      Array.isArray(sourceValue) === Array.isArray(targetValue)
    ) {
      if (sourceValue instanceof Date && targetValue instanceof Date) {
        if (sourceValue.getTime() !== targetValue.getTime()) {
          ObjectUtil._conflict(result, key, sourceValue, targetValue);
        }
        return;
      }

      // Recursively diff nested objects and arrays
      const diff = ObjectUtil.diff(sourceValue, targetValue);
      if (Object.keys(diff).length > 0) {
        ObjectUtil.setDefault<GenericType>(result, 'conflicts', {})[key] = diff;
      }
      return;
    }

    if (sourceValue !== targetValue) {
      ObjectUtil._conflict(result, key, sourceValue, targetValue);
    }
  }

  private static _conflict(
    result: GenericType<GenericType>,
    key: string,
    sourceValue: unknown,
    targetValue: unknown,
  ): void {
    ObjectUtil.setDefault<GenericType>(result, 'conflicts', {})[key] = [
      typeof sourceValue,
      sourceValue,
      typeof targetValue,
      targetValue,
    ];
  }

  // /**
  //  * Retrieves the value of a nested attribute from an object.
  //  *
  //  * @param {any} object - The object to retrieve the attribute from.
  //  * @param {string} attr - The attribute to retrieve.
  //  * @returns {unknown} The value of the attribute or null if not found.
  //  */
  // // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // static getAttr(object: any, attr: string): unknown {
  //   if (!object || !attr || typeof object !== 'object') {
  //     return null;
  //   }

  //   return attr.split('.').reduce((value, key) => (value && key in value) ? value[key] ?? null : null, object);
  // }

  // /**
  //  * Sets the value of a nested attribute in an object.
  //  *
  //  * @param {any} object - The object to set the attribute on.
  //  * @param {string} attr - The attribute to set.
  //  * @param {unknown} value - The value to set for the attribute.
  //  */
  // // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // static setAttr(object: any, attr: string, value: unknown): void {
  //   if (!object || !attr || typeof object !== 'object') {
  //     return;
  //   }

  //   const keys = attr.split('.');
  //   const lastKey = keys.pop();

  //   const target = keys.reduce((acc, key) => {
  //     if (!acc[key]) {
  //       acc[key] = {};
  //     }
  //     return acc[key];
  //   }, object);

  //   if (lastKey) {
  //     target[lastKey] = value;
  //   }
  // }
}
/**
 * Utility class for working with ISO 8601 date strings (`YYYY-MM-DD`).
 * All methods operate on and return strings in that format unless otherwise noted.
 */
export class DateUtil {
  /** Returns today's date as `YYYY-MM-DD`. */
  static today(): string {
    return DateUtil.isoFormat(new Date());
  }

  /** Returns the first day of the current month as `YYYY-MM-DD`. */
  static monthStart(): string {
    const _today = new Date();
    return DateUtil.isoFormat(
      new Date(_today.getFullYear(), _today.getMonth(), 1),
    );
  }

  /** Formats a `Date` object as `YYYY-MM-DD`. */
  static isoFormat(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  /** Formats a `Date` object as `YYYY-MM-DD` using its UTC calendar date. */
  static isoFormatUtc(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Converts a Unix epoch timestamp (ms) to a `YYYY-MM-DD` string in the
   * **local** time zone. Compare {@link fromTimestamp}, which uses UTC.
   */
  static fromTimestampLocal(timestamp: number): string {
    return DateUtil.isoFormat(new Date(timestamp));
  }

  /**
   * Returns the local calendar date `diff` days from today (positive = future,
   * negative = past). Unlike {@link diffDate}, which adds 24h multiples to a UTC
   * instant, this moves the local calendar day and is DST-safe.
   */
  static diffDateLocal(diff: string): string {
    const date = new Date();
    date.setDate(date.getDate() + Number.parseInt(diff));
    return DateUtil.isoFormat(date);
  }

  /** Returns `true` if `date` is a real calendar date in `YYYY-MM-DD` form. */
  static isValidDate(date: string): boolean {
    if (!DATE_PATTERN.test(date)) {
      return false;
    }
    const [y, m, d] = date.split('-').map(Number);
    const parsed = new Date(Date.UTC(y, m - 1, d));
    return DateUtil.isoFormatUtc(parsed) === date;
  }

  /**
   * Converts a Unix epoch timestamp (ms) to a `YYYY-MM-DD` string in **UTC**.
   * See {@link fromTimestampLocal} for the local-time equivalent.
   */
  static fromTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString().split('T')[0];
  }

  /**
   * Returns the UTC date that is `diff` × 24h from now, where `diff` is a string
   * parseable as an integer (positive = future, negative = past). Prefer
   * {@link diffDateLocal} when comparing against local {@link today}.
   */
  static diffDate(diff: string): string {
    return new Date(Date.now() + Number.parseInt(diff) * DAY_IN_MILLIS)
      .toISOString()
      .split('T')[0];
  }

  /** Returns `true` if `date` is before today. */
  static isPast(date: string): boolean {
    return date < DateUtil.today();
  }

  /** Returns `true` if `date` is after today. */
  static isFuture(date: string): boolean {
    return date > DateUtil.today();
  }

  /** Returns `true` if `date` equals today. */
  static isToday(date: string): boolean {
    return date === DateUtil.today();
  }

  /** Returns `true` if `date` falls within `[start, end]` inclusive. */
  static isBetween(date: string, start: string, end: string): boolean {
    return date >= start && date <= end;
  }
}

/**
 * Factory methods for common Angular `ValidatorFn` implementations.
 * Use the static `VALIDATORS` object to compose validators declaratively in reactive forms.
 *
 * @example
 * ```ts
 * this.form = this.fb.group({
 *   name: ['', FormUtil.VALIDATORS.TEXT({ minLength: 2, maxLength: 50 })],
 *   age:  [null, FormUtil.VALIDATORS.NUMBER({ min: 0, max: 120 })],
 *   dob:  ['', FormUtil.VALIDATORS.DATE({ allowPast: true })],
 * });
 * // group-level: new FormGroup({...}, { validators: FormUtil.VALIDATORS.DATE_RANGE() })
 * ```
 */
export class FormUtil {
  /** Empty values are skipped by validators; `required` is validated separately. */
  private static _isBlank(value: unknown): boolean {
    return value == null || value === '';
  }

  private static _validateControl(
    control: AbstractControl,
    options: {
      pattern?: string;
      minLength?: number;
      maxLength?: number;
      length?: number;
    },
  ): ValidationErrors | null {
    if (FormUtil._isBlank(control.value)) {
      return null;
    }

    const controlValue = control.value.toString();

    if (options.pattern && !controlValue.match(options.pattern)) {
      return { error: `Value does not match pattern ${options.pattern}` };
    }

    if (options.minLength && controlValue.length < options.minLength) {
      return { error: `Value length cannot be less than ${options.minLength}` };
    }

    if (options.maxLength && controlValue.length > options.maxLength) {
      return {
        error: `Value length cannot be greater than ${options.maxLength}`,
      };
    }

    if (options.length && controlValue.length !== options.length) {
      return { error: `Value length must be ${options.length}` };
    }

    return null;
  }

  private static _validateDate(
    control: AbstractControl,
    checkValue: string,
    checkType: 'before' | 'after' = 'before',
  ): ValidationErrors | null {
    const value = control.value;
    let compareDate;
    if (DATE_PATTERN.exec(checkValue)) {
      // checkValue is a date
      compareDate = checkValue;
    } else {
      compareDate = DateUtil.diffDateLocal(checkValue);
    }

    if (!compareDate) {
      return null;
    }

    if (
      (checkType === 'before' && value < compareDate) ||
      (checkType === 'after' && value > compareDate)
    ) {
      return { error: `Date cannot be ${checkType} ${compareDate}` };
    }

    return null;
  }

  static readonly VALIDATORS = {
    /**
     * Validates a text control against optional `pattern`, `minLength`, `maxLength`,
     * or exact `length` constraints. Skips empty values (pair with `Validators.required`).
     */
    TEXT(
      options: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        length?: number;
      } = {},
    ): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
        return FormUtil._validateControl(control, options);
      };
    },

    /**
     * Validates a numeric control. Inherits text constraints from `TEXT`, then additionally
     * checks `min`, `max`, and `decimalPlaces`. Skips empty values (pair with `Validators.required`).
     */
    NUMBER(
      options: {
        pattern?: string;
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
        length?: number;
        decimalPlaces?: number;
      } = {},
    ): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
        const errors = FormUtil._validateControl(control, options);
        if (errors) {
          return errors;
        }

        if (FormUtil._isBlank(control.value)) {
          return null;
        }

        const numeric = Number(control.value);
        if (Number.isNaN(numeric)) {
          return { error: 'Value must be a number' };
        }

        if (options.min !== undefined && numeric < options.min) {
          return { error: `Value cannot be less than ${options.min}` };
        }

        if (options.max !== undefined && numeric > options.max) {
          return { error: `Value cannot be greater than ${options.max}` };
        }

        if (options.decimalPlaces !== undefined) {
          const decimalPlaces =
            control.value.toString().split('.')[1]?.length || 0;
          if (decimalPlaces > options.decimalPlaces) {
            return {
              error: `Value cannot have more than ${options.decimalPlaces} decimal places`,
            };
          }
        }

        return null;
      };
    },

    /**
     * Validates a date control (expects `YYYY-MM-DD` strings).
     * - By default rejects past dates; set `allowPast: true` to permit them.
     * - `disallowFuture: true` rejects future dates.
     * - `notBefore` / `notAfter` accept an ISO date string **or** a day-offset string
     *   (e.g. `"-7"` for 7 days ago, `"30"` for 30 days from today).
     */
    DATE(
      options: {
        allowPast?: boolean;
        disallowFuture?: boolean;
        notBefore?: string;
        notAfter?: string;
      } = {},
    ): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
        if (FormUtil._isBlank(control.value)) {
          return null;
        }

        const value = String(control.value);
        if (!DATE_PATTERN.test(value)) {
          return { error: 'Date does not match pattern "YYYY-MM-DD"' };
        }

        if (!DateUtil.isValidDate(value)) {
          return { error: 'Date is not a valid calendar date' };
        }

        if (!options.allowPast && DateUtil.isPast(value)) {
          return { error: 'Date cannot be in the past' };
        }

        if (options.disallowFuture && DateUtil.isFuture(value)) {
          return { error: 'Date cannot be in the future' };
        }

        if (options.notBefore) {
          const errors = FormUtil._validateDate(
            control,
            options.notBefore,
            'before',
          );
          if (errors) {
            return errors;
          }
        }

        if (options.notAfter) {
          const errors = FormUtil._validateDate(
            control,
            options.notAfter,
            'after',
          );
          if (errors) {
            return errors;
          }
        }

        return null;
      };
    },

    /**
     * Group-level validator: the start date cannot be after the end date. Attach it to
     * the `FormGroup` (`new FormGroup({...}, { validators: DATE_RANGE() })`). It is pure,
     * leaves other control/group errors untouched and reports under its own key,
     * `dateRange`. Empty or invalid dates are ignored (validate them per control).
     *
     * @param startDateControl Control name for the start date (default: `'startDate'`).
     * @param endDateControl Control name for the end date (default: `'endDate'`).
     */
    DATE_RANGE(
      startDateControl = 'startDate',
      endDateControl = 'endDate',
    ): ValidatorFn {
      return (group: AbstractControl): ValidationErrors | null => {
        const start = group.get(startDateControl)?.value;
        const end = group.get(endDateControl)?.value;
        if (
          typeof start !== 'string' ||
          typeof end !== 'string' ||
          !DateUtil.isValidDate(start) ||
          !DateUtil.isValidDate(end)
        ) {
          return null;
        }
        return start > end
          ? { dateRange: 'Start date cannot be after end date' }
          : null;
      };
    },
  };
}
