import { HttpResponse } from '@angular/common/http';
import { parse } from 'content-disposition';
import { CrudDataSource, ReadModel, WriteModel } from './crud.types';

/**
 * The file name of a downloaded response, from `Content-Disposition`
 * (RFC 6266, with RFC 8187 `filename*` winning over the quoted fallback) via
 * the `content-disposition` package. Returns `fallback` when the header is
 * absent, has no filename or is malformed. A cross-origin browser can read the
 * header only if the server lists it in `Access-Control-Expose-Headers`.
 */
export function fileNameFrom(
  response: HttpResponse<Blob>,
  fallback = 'download',
): string {
  const header = response.headers.get('Content-Disposition');
  if (!header) return fallback;
  try {
    return parse(header).parameters['filename'] || fallback;
  } catch {
    return fallback;
  }
}

/**
 * An `Idempotency-Key` for one create: `get()` returns the same UUID for every
 * retry of a submit, and `reset()` (after success, or when the user changes
 * the form) makes the next `get()` a new attempt.
 */
export class IdempotencyKey {
  private key?: string;

  get(): string {
    return (this.key ??= crypto.randomUUID());
  }

  reset(): void {
    this.key = undefined;
  }
}

/** An optional {@link CrudDataSource} method a screen hides when it is absent. */
export type CrudFeature =
  'batchDelete' | 'import' | 'importTemplate' | 'export';

/** Which optional actions the data source provides. */
export function crudFeatures<
  $Q extends WriteModel<$K>,
  $S extends ReadModel<$K>,
  $K extends string | number,
>(dataSource: CrudDataSource<$Q, $S, $K>): Record<CrudFeature, boolean> {
  return {
    batchDelete: typeof dataSource.batchDelete === 'function',
    import: typeof dataSource.import === 'function',
    importTemplate: typeof dataSource.importTemplate === 'function',
    export: typeof dataSource.export === 'function',
  };
}
