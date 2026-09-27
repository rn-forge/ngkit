import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { fileNameFrom } from './crud.files';
import {
  CrudDataSource,
  CrudFileDownload,
  CrudFilter,
  ImportReport,
  ListResponse,
  ReadModel,
  Versioned,
  WriteModel,
} from './crud.types';

/** Readonly configuration for {@link standardDataSource}. */
export interface StandardDataSourceConfig {
  /** App-owned base URL, e.g. from an `InjectionToken`. Joined as-is (no slash normalization). */
  readonly baseUrl: string;
  /** Collection path, e.g. `'/orders'`. */
  readonly collection: string;
  /** Optional methods to provide; the screen hides an action whose method is absent. */
  readonly features?: {
    readonly batchDelete?: boolean;
    readonly import?: boolean;
    readonly importTemplate?: boolean;
    /** Formats offered for export, sent as `Accept` (e.g. `'text/csv'`). Non-empty enables `export`. */
    readonly export?: readonly string[];
  };
}

const MERGE_PATCH = 'application/merge-patch+json';

/** Filter → query params: `undefined` and `null` are dropped, arrays repeat the parameter. */
function filterParams(
  filter: CrudFilter = {},
): Record<string, string | number | boolean | (string | number | boolean)[]> {
  const params: Record<
    string,
    string | number | boolean | (string | number | boolean)[]
  > = {};
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null) continue;
    params[key] = Array.isArray(value)
      ? [...value]
      : (value as string | number | boolean);
  }
  return params;
}

/**
 * The {@link CrudDataSource} for any backend that follows the wire standards
 * the resource screen targets (AIP-158 paging, AIP-132 `orderBy`, RFC 7396 merge
 * patch with `ETag`/`If-Match`, `Idempotency-Key`, AIP-163 `:import`, AIP-235
 * `:batchDelete`; see `docs/architecture/resource-screen.md`). It names and
 * detects no particular server framework.
 *
 * Call it in an injection context, like `inject()`. It adds no retries,
 * caching or error mapping: an `HttpErrorResponse` reaches the subscriber
 * unchanged, and interceptors stay the app's. A `null` filter value is dropped
 * like `undefined`.
 */
export function standardDataSource<
  $Q extends WriteModel<$K>,
  $S extends ReadModel<$K>,
  $K extends string | number = number,
>(config: StandardDataSourceConfig): CrudDataSource<$Q, $S, $K> {
  if (!config?.baseUrl || !config.collection) {
    throw new Error(
      '[rn-forge.ng.crud] standardDataSource() requires "baseUrl" and "collection" in its config.',
    );
  }
  const http = inject(HttpClient);
  const url = `${config.baseUrl}${config.collection}`;
  const itemUrl = (id: $K) => `${url}/${encodeURIComponent(String(id))}`;

  const versioned = (res: HttpResponse<$S>): Versioned<$S> => ({
    value: res.body as $S,
    etag: res.headers.get('ETag') ?? undefined,
  });
  const download = (res: HttpResponse<Blob>): CrudFileDownload => ({
    blob: res.body as Blob,
    fileName: fileNameFrom(res),
  });

  const source: CrudDataSource<$Q, $S, $K> = {
    list: ({ pageSize, pageToken, orderBy, filter }) =>
      http.get<ListResponse<$S>>(url, {
        params: new HttpParams({
          fromObject: {
            ...filterParams(filter),
            ...(pageSize === undefined ? {} : { pageSize }),
            ...(pageToken === undefined ? {} : { pageToken }),
            ...(orderBy === undefined ? {} : { orderBy }),
          },
        }),
      }),

    get: (id) =>
      http.get<$S>(itemUrl(id), { observe: 'response' }).pipe(map(versioned)),

    create: (payload, options) =>
      http
        .post<$S>(url, payload, {
          observe: 'response',
          headers: options?.idempotencyKey
            ? new HttpHeaders({ 'Idempotency-Key': options.idempotencyKey })
            : undefined,
        })
        .pipe(map(versioned)),

    update: (id, patch, options) =>
      http
        .patch<$S>(itemUrl(id), patch, {
          observe: 'response',
          headers: new HttpHeaders({
            'Content-Type': MERGE_PATCH,
            ...(options?.etag ? { 'If-Match': options.etag } : {}),
          }),
        })
        .pipe(map(versioned)),

    delete: (id) => http.delete<void>(itemUrl(id)).pipe(map(() => undefined)),
  };

  const { features } = config;
  if (features?.batchDelete) {
    source.batchDelete = (ids) =>
      http.post<void>(`${url}:batchDelete`, { ids }).pipe(map(() => undefined));
  }
  if (features?.import) {
    source.import = (file, { validateOnly }): Observable<ImportReport> => {
      const body = new FormData();
      body.append('file', file);
      return http.post<ImportReport>(`${url}:import`, body, {
        params: validateOnly
          ? new HttpParams().set('validateOnly', true)
          : undefined,
      });
    };
  }
  if (features?.importTemplate) {
    source.importTemplate = (filter, { prefill }) =>
      http
        .get(`${url}:importTemplate`, {
          params: new HttpParams({
            fromObject: {
              ...filterParams(filter),
              ...(prefill ? { prefill: true } : {}),
            },
          }),
          observe: 'response',
          responseType: 'blob',
        })
        .pipe(map(download));
  }
  if (features?.export?.length) {
    source.export = (format, filter) =>
      http
        .get(url, {
          params: new HttpParams({ fromObject: filterParams(filter) }),
          headers: new HttpHeaders({ Accept: format }),
          observe: 'response',
          responseType: 'blob',
        })
        .pipe(map(download));
  }
  return source;
}
