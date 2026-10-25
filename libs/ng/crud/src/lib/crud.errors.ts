import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl } from '@angular/forms';
import { problemOf } from '@rn-forge/ng/core';

/** One RFC 9457 extension entry: `pointer` is an RFC 6901 JSON Pointer into the request body. */
export interface ProblemFieldError {
  readonly pointer?: string;
  readonly detail: string;
}

/** The `errors` extension the API conventions use; a problem is read as `Problem<ProblemErrors>`. */
type ProblemErrors = { readonly errors?: readonly ProblemFieldError[] };

/** What a failed save means for the screen. */
export type CrudErrorKind = 'conflict' | 'problem' | 'other';

/** The validation error key set on controls and forms by {@link problemToFormErrors}. */
export const SERVER_ERROR_KEY = 'server';

/**
 * A problem is a response whose media type is `application/problem+json`,
 * not a body that merely looks like one.
 *
 * 412 is the `If-Match` precondition failing: the screen offers reload and
 * reapply, never a silent overwrite. Any other 4xx with a problem body is a
 * `problem` to show on the form.
 */
export function crudErrorKind(error: unknown): CrudErrorKind {
  if (!(error instanceof HttpErrorResponse)) return 'other';
  if (error.status === 412) return 'conflict';
  if (error.status >= 400 && error.status < 500 && problemOf(error)) {
    return 'problem';
  }
  return 'other';
}

/** RFC 6901: `/a/b~1c/0` → `['a', 'b/c', '0']`; `''` (whole document) → `[]`. */
function pointerSegments(pointer: string): string[] {
  return pointer
    .split('/')
    .slice(1)
    .map((s) => s.replaceAll('~1', '/').replaceAll('~0', '~'));
}

/**
 * Puts an RFC 9457 problem on a form: each `errors[].pointer` that resolves to
 * a control sets `{ server: string[] }` on it and marks it touched; entries
 * that don't resolve, plus a problem with no `errors`, become a form-level
 * `{ server: string[] }` (from `detail`/`title`). Angular clears the errors on
 * the control's next validation, i.e. when the user edits it.
 *
 * Returns `false`, leaving the form untouched, when `error` isn't an
 * `HttpErrorResponse` with an `application/problem+json` body. Hand-rolled: no
 * maintained package maps RFC 9457 pointers onto Angular forms (npm checked
 * 2026-09-23); the pointer parse is a few lines, so it takes no JSON Pointer
 * dependency.
 */
export function problemToFormErrors(
  error: unknown,
  form: AbstractControl,
): boolean {
  const details = problemOf<ProblemErrors>(error);
  if (!details) return false;

  const formLevel: string[] = [];
  const byControl = new Map<AbstractControl, string[]>();
  for (const { pointer, detail } of details.errors ?? []) {
    const segments = pointer ? pointerSegments(pointer) : [];
    const control = segments.length ? form.get(segments) : null;
    if (control) {
      byControl.set(control, [...(byControl.get(control) ?? []), detail]);
    } else {
      formLevel.push(detail);
    }
  }
  if (!details.errors?.length) {
    const summary = details.detail ?? details.title;
    if (summary) formLevel.push(summary);
  }

  for (const [control, messages] of byControl) {
    control.setErrors({ [SERVER_ERROR_KEY]: messages });
    control.markAsTouched();
  }
  if (formLevel.length) form.setErrors({ [SERVER_ERROR_KEY]: formLevel });
  return true;
}
