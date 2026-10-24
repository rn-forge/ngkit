// external imports
import { HttpErrorResponse } from '@angular/common/http';

// definitions
/** The members RFC 9457 §3.1 defines for a problem. */
export interface ProblemMembers {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly instance?: string;
}

/** An RFC 9457 problem; `$Ext` types the extension members an application reads. */
export type Problem<$Ext extends object = object> = ProblemMembers &
  $Ext & { readonly [member: string]: unknown };

/** The media type that makes a response a problem (RFC 9457 §3). */
export const PROBLEM_MEDIA_TYPE = 'application/problem+json';

/** The problem body of an `HttpErrorResponse`, or `undefined` when it is not one. */
export function problemOf<$Ext extends object = object>(
  error: unknown,
): Problem<$Ext> | undefined {
  if (!(error instanceof HttpErrorResponse)) return undefined;
  const mediaType = error.headers
    ?.get('Content-Type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase();
  const body: unknown = error.error;
  if (
    mediaType !== PROBLEM_MEDIA_TYPE ||
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body) ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return undefined;
  }
  return body as Problem<$Ext>;
}

/** `detail ?? title` of a problem; otherwise the fallback for an HTTP failure, or the error's own message. */
export function problemMessage(
  error: unknown,
  fallback: (status: number) => string = (status) =>
    `Request failed (${status})`,
): string {
  const problem = problemOf(error);
  const summary = problem?.detail ?? problem?.title;
  if (typeof summary === 'string' && summary) return summary;
  if (error instanceof HttpErrorResponse) return fallback(error.status);
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Resolves `reference` against `base`; the raw string when either is not a valid URI. */
function resolve(reference: string, base: string | null | undefined): string {
  if (!base) return reference;
  try {
    return new URL(reference, base).href;
  } catch {
    return reference;
  }
}

/** The problem `type` resolved against the response URL; `'about:blank'` when absent; `undefined` when not a problem. */
export function problemTypeOf(error: unknown): string | undefined {
  const problem = problemOf(error);
  if (!problem) return undefined;
  const type = problem.type;
  if (typeof type !== 'string') return 'about:blank';
  return resolve(type, (error as HttpErrorResponse).url);
}

/** Whether the problem's resolved `type` equals `type`, resolved against the same base. */
export function hasProblemType(error: unknown, type: string): boolean {
  const actual = problemTypeOf(error);
  return (
    actual !== undefined &&
    actual === resolve(type, (error as HttpErrorResponse).url)
  );
}
