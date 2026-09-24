import { Observable } from 'rxjs';
import { GenericType } from '@rn-forge/ng/core';

/** Write model (request payload). `$K` is the resource's ID type. */
export interface WriteModel<
  $K extends string | number = number,
> extends GenericType {
  id?: $K | null;
}

/** Read model (response payload). `$K` is the resource's ID type. */
export interface ReadModel<
  $K extends string | number = number,
> extends GenericType {
  readonly id: $K;
}

/** A filter value: `undefined`/`null` are dropped, arrays repeat the parameter. */
export type CrudFilterValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[];

/** Named per-field query parameters the app declares (no expression language). */
export type CrudFilter = Record<string, CrudFilterValue>;

/** AIP-158 list request; `orderBy` is AIP-132 (`name desc,createTime`). */
export interface ListRequest {
  readonly pageSize?: number;
  readonly pageToken?: string;
  readonly orderBy?: string;
  readonly filter?: CrudFilter;
}

/** AIP-158 list response; `nextPageToken` is `null` on the last page. */
export interface ListResponse<T> {
  readonly items: T[];
  readonly nextPageToken: string | null;
  /** Present only when the backend opts in to totals. */
  readonly totalSize?: number;
}

/** A value with the `ETag` it was read with, sent back as `If-Match`. */
export interface Versioned<T> {
  readonly value: T;
  readonly etag?: string;
}

/** Result of `:import` (AIP-163 `validateOnly` echoes the same shape). */
export interface ImportReport {
  readonly created: number;
  readonly updated: number;
  readonly skipped: number;
  readonly validateOnly: boolean;
  /** The sanctioned partial-save variant: a 200 that lists the rows that failed. */
  readonly errors?: readonly { pointer?: string; detail: string }[];
}

/** A downloaded file: the raw content plus the name to save it as. */
export interface CrudFileDownload {
  readonly blob: Blob;
  readonly fileName: string;
}

/**
 * The data contract a resource screen needs, exactly the methods it calls.
 * Implement it over `HttpClient`, a generated client, or use
 * `standardDataSource()`. Optional methods are feature-detected: an absent
 * method hides the matching action. Errors stay `HttpErrorResponse`.
 *
 * @template $Q Write model, extends {@link WriteModel}.
 * @template $S Read model, extends {@link ReadModel}.
 * @template $K Resource ID type, `string` or `number`.
 */
export interface CrudDataSource<
  $Q extends WriteModel<$K>,
  $S extends ReadModel<$K>,
  $K extends string | number = number,
> {
  list(request: ListRequest): Observable<ListResponse<$S>>;
  get(id: $K): Observable<Versioned<$S>>;
  create(
    payload: $Q,
    options?: { idempotencyKey?: string },
  ): Observable<Versioned<$S>>;
  update(
    id: $K,
    patch: Partial<$Q>,
    options?: { etag?: string },
  ): Observable<Versioned<$S>>;
  delete(id: $K): Observable<void>;

  batchDelete?(ids: $K[]): Observable<void>;
  import?(
    file: File,
    options: { validateOnly: boolean },
  ): Observable<ImportReport>;
  importTemplate?(
    filter: CrudFilter,
    options: { prefill: boolean },
  ): Observable<CrudFileDownload>;
  export?(format: string, filter: CrudFilter): Observable<CrudFileDownload>;
}
