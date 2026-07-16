// external imports
import { signal, WritableSignal } from '@angular/core';
import {
  AbstractControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { isEmpty } from 'lodash-es';

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
    const result = {}; //new ObjectDiff();

    if (target) {
      for (const key in target) {
        const targetValue = target[key];

        if (!(source && key in source)) {
          // directly carry over the value if it doesn't exist in the target or is an array
          ObjectUtil.setDefault<GenericType>(result, 'missing_in_source', {})[
            key
          ] = targetValue;
          continue;
        }

        const sourceValue = source[key];
        if (isEmpty(sourceValue) && isEmpty(targetValue)) {
          // both source and target are empty, do nothing
          continue;
        } else if (
          typeof sourceValue === 'object' &&
          typeof targetValue === 'object'
        ) {
          // Recursively merge nested objects
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const diff = ObjectUtil.diff(sourceValue as any, targetValue);
          if (!isEmpty(diff)) {
            ObjectUtil.setDefault<GenericType>(result, 'conflicts', {})[key] =
              diff;
          }
        } else if (
          sourceValue !== targetValue &&
          typeof sourceValue !== 'function'
        ) {
          // Overwrite value with override
          ObjectUtil.setDefault<GenericType>(result, 'conflicts', {})[key] = [
            typeof sourceValue,
            sourceValue,
            typeof targetValue,
            targetValue,
          ];
        }
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

  /** Converts a Unix epoch timestamp (ms) to a `YYYY-MM-DD` string. */
  static fromTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString().split('T')[0];
  }

  /**
   * Returns the date that is `diff` days from today, where `diff` is a string
   * parseable as an integer (positive = future, negative = past).
   */
  static diffDate(diff: string): string {
    return new Date(Date.now() + parseInt(diff) * DAY_IN_MILLIS)
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
 * FormUtil.VALIDATORS.DATE_RANGE(this.form, 'startDate', 'endDate');
 * ```
 */
export class FormUtil {
  private static _validateControl(
    control: AbstractControl,
    options: {
      pattern?: string;
      minLength?: number;
      maxLength?: number;
      length?: number;
    },
  ): ValidationErrors | null {
    if (!control.dirty || !control.value) {
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
    if (checkValue.match(DATE_PATTERN)) {
      // checkValue is a date
      compareDate = checkValue;
    } else {
      compareDate = DateUtil.diffDate(checkValue);
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

  static VALIDATORS = {
    /**
     * Validates a text control against optional `pattern`, `minLength`, `maxLength`,
     * or exact `length` constraints. Only runs on dirty, non-empty controls.
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
        const errors = FormUtil._validateControl(control, options);
        return errors ? errors : null;
      };
    },

    /**
     * Validates a numeric control. Inherits text constraints from `TEXT`, then additionally
     * checks `min`, `max`, and `decimalPlaces`. Only runs on dirty, non-empty controls.
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

        if (!control.dirty || !control.value) {
          return null;
        }

        if (isNaN(control.value)) {
          return { error: 'Value must be a number' };
        }

        if (options.min && control.value < options.min) {
          return { error: `Value cannot be less than ${options.min}` };
        }

        if (options.max && control.value > options.max) {
          return { error: `Value cannot be greater than ${options.max}` };
        }

        if (options.decimalPlaces) {
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
        if (!control.dirty || !control.value) {
          return null;
        }

        if (!control.value.match(DATE_PATTERN)) {
          return { error: 'Date does not match pattern "YYYY-MM-DD"' };
        }

        if (!options.allowPast && DateUtil.isPast(control.value)) {
          return { error: 'Date cannot be in the past' };
        }

        if (options.disallowFuture && DateUtil.isFuture(control.value)) {
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
     * Wires cross-field validation onto a `FormGroup` so that start cannot be after end
     * and end cannot be before start. Call once after the form is created — it subscribes
     * to `valueChanges` on both controls and sets/clears errors reactively.
     *
     * @param formGroup The reactive form containing both date controls.
     * @param startDateControl Control name for the start date (default: `'startDate'`).
     * @param endDateControl Control name for the end date (default: `'endDate'`).
     */
    DATE_RANGE(
      formGroup: FormGroup,
      startDateControl = 'startDate',
      endDateControl = 'endDate',
    ): void {
      formGroup.controls[startDateControl].valueChanges.subscribe((value) => {
        const endDate = formGroup.controls[endDateControl];
        if (endDate.value && endDate.value < value) {
          formGroup.controls[startDateControl].setErrors({
            error: 'Start date cannot be after end date',
          });
        } else {
          endDate.setErrors(null);
        }
      });

      formGroup.controls[endDateControl].valueChanges.subscribe((value) => {
        const startDate = formGroup.controls[startDateControl];
        if (value && startDate.value > value) {
          formGroup.controls[endDateControl].setErrors({
            error: 'End date cannot be before start date',
          });
        } else {
          startDate.setErrors(null);
        }
      });
    },
  };
}
