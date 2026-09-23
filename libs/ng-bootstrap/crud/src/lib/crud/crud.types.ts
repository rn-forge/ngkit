import { Observable } from 'rxjs';
import { GenericType } from '@rn-forge/ng/core';
import {
  AlertComponent,
  ConfigOptions,
  ModalComponent,
  ModalOptions,
  TableComponent,
  TableOptions,
} from '@rn-forge/ng-bootstrap';
import { FormComponent, FormOptions } from '@rn-forge/ng-bootstrap/form';

export type COMPONENT_MODES = 'list' | 'addupdate' | 'upload' | 'download';

// ---------------------------------------------------------------------------
// CrudDataSource — the screen's data contract, implemented over HttpClient
// (or a generated client) by the application. H4 in
// docs/plans/ngkit-roadmap.md replaces it.
// ---------------------------------------------------------------------------

/** Write model (request payload). `$K` is the resource's ID type. */
export interface WriteModel<$K extends string | number = number>
  extends GenericType {
  id?: $K | null;
}

/** Read model (response payload). `$K` is the resource's ID type. */
export interface ReadModel<$K extends string | number = number>
  extends GenericType {
  readonly id: $K;
}

/** Paginated list envelope, matching the common DRF-style list response. */
export interface ListResponse<T> {
  readonly count: number;
  readonly next?: string | null;
  readonly previous?: string | null;
  readonly results: T[];
}

export interface BulkDeleteResponse {
  readonly count: number;
  readonly message: string;
}

export interface UploadResponse {
  readonly created: number;
  readonly updated: number;
  readonly errors: { row: string; message: string }[];
}

/** A downloaded file: the raw content plus the filename to save it as. */
export interface CrudFileDownload {
  readonly blob: Blob;
  readonly fileName: string;
}

/**
 * The data contract `AbstractCRUDManager` needs from a resource: exactly the
 * methods it calls, nothing more. Implement it directly over `HttpClient` (or
 * a generated OpenAPI client) — it is not a transport base class.
 *
 * @template $Q Write model (request payload), extends {@link WriteModel}.
 * @template $S Read model (response payload), extends {@link ReadModel}.
 * @template $K Resource ID type, `number` or `string`.
 */
export interface CrudDataSource<
  $Q extends WriteModel<$K>,
  $S extends ReadModel<$K>,
  $K extends string | number = number,
> {
  list(params?: GenericType): Observable<ListResponse<$S>>;
  create(payload: $Q): Observable<$S>;
  update(id: $K, payload: $Q): Observable<$S>;
  bulkDelete(ids: $K[]): Observable<BulkDeleteResponse>;
  upload(fieldName: string): Observable<UploadResponse>;
  uploadTemplate(params?: GenericType): Observable<CrudFileDownload>;
  download(params?: GenericType): Observable<CrudFileDownload>;
}

export interface CRUDOptions extends ConfigOptions {
  list: Partial<TableOptions>;
  addUpdate: Partial<FormOptions>;
  delete: Partial<ModalOptions>;
  upload: Partial<FormOptions>;
  download: Partial<FormOptions>;
}

export interface CRUDContext {
  readonly listTable: TableComponent;
  readonly addUpdateForm: FormComponent;
  readonly deleteModal: ModalComponent;
  readonly uploadForm: FormComponent;
  readonly downloadForm: FormComponent;
  readonly alert: AlertComponent;
  readonly config: () => CRUDOptions;
}
