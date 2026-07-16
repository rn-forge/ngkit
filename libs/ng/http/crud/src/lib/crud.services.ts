// external imports
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';

// internal imports
import { GenericType, isDebugMode } from '@rn-forge/ng/core';
import {
  AbstractHTTPService,
  BaseResponse,
  DownloadResponse,
} from '@rn-forge/ng/http';
import {
  BulkDeleteResponse,
  ListResponse,
  ReadModel,
  UploadResponse,
  WriteModel,
} from './crud.types';

/**
 * Abstract base class for backend resource services providing standard CRUD operations.
 *
 * Extend this class to create a service for a specific API resource. The generic parameters
 * define the shape of data sent to (`$Q`) and received from (`$S`) the backend.
 *
 * @template $Q - Write model (request payload), must extend {@link WriteModel}.
 * @template $S - Read model (response payload), must extend {@link ReadModel}.
 *
 * @example
 * ```ts
 * @Injectable({ providedIn: 'root' })
 * export class ProductsService extends BackendService<ProductWrite, ProductRead> {
 *   constructor() { super('products'); }
 * }
 * ```
 */
export abstract class BackendService<
  $Q extends WriteModel,
  $S extends ReadModel,
> extends AbstractHTTPService {
  private readonly document: Document = inject(DOCUMENT);

  /**
   * @param apiPath - The resource path segment appended to the configured API base URL (e.g. `'products'`).
   */
  constructor(apiPath: string) {
    super(apiPath);
  }

  /**
   * Fetches a paginated list of resources.
   * Defaults `limit` to 2000 if not specified in `queryParams`.
   *
   * @param queryParams - Optional query string parameters (e.g. filters, pagination).
   * @param options - Optional request options passed to the HTTP layer.
   * @returns Observable emitting a {@link ListResponse} containing the result array and pagination metadata.
   */
  list(
    queryParams?: GenericType,
    options?: GenericType,
  ): Observable<ListResponse<$S>> {
    queryParams ??= {};
    queryParams['limit'] ??= 2000;
    return this.GET<ListResponse<$S>>('list', '', queryParams, options);
  }

  /**
   * Creates a new resource.
   *
   * @param object - The write model payload to send.
   * @param options - Optional request options.
   * @returns Observable emitting the created resource as a read model.
   */
  create(object: $Q, options?: GenericType): Observable<$S> {
    return this.POST<$S>('create', '', object, {}, options);
  }

  /**
   * Fetches a single resource by ID.
   *
   * @param id - The numeric ID of the resource to retrieve.
   * @param queryParams - Optional query string parameters.
   * @param options - Optional request options.
   * @returns Observable emitting the resource as a read model.
   */
  read(
    id: number,
    queryParams?: GenericType,
    options?: GenericType,
  ): Observable<$S> {
    return this.GET<$S>('read', String(id), queryParams, options);
  }

  /**
   * Updates an existing resource by ID.
   *
   * @param id - The numeric ID of the resource to update.
   * @param object - The write model payload with updated values.
   * @param options - Optional request options.
   * @returns Observable emitting the updated resource as a read model.
   */
  update(id: number, object: $Q, options?: GenericType): Observable<$S> {
    return this.PUT<$S>('update', String(id), object, {}, options);
  }

  /**
   * Deletes a resource by ID.
   *
   * @param id - The numeric ID of the resource to delete.
   * @param options - Optional request options.
   * @returns Observable emitting `true` if the server confirmed successful deletion.
   */
  delete(id: number, options?: GenericType): Observable<boolean> {
    return this.DELETE<BaseResponse>(
      'delete',
      String(id),
      {},
      {},
      options,
    ).pipe(map((_response: BaseResponse) => _response['status'] === 'success'));
  }

  /**
   * Uploads a file from a file input element identified by its DOM ID.
   * Reads the first selected file and sends it as `multipart/form-data`.
   *
   * @param fileInputId - The `id` attribute of the `<input type="file">` element.
   * @param options - Optional request options.
   * @returns Observable emitting an {@link UploadResponse} with insert/update/error counts.
   * @throws Error if no file is selected in the specified input.
   */
  upload(
    fileInputId: string,
    options?: GenericType,
  ): Observable<UploadResponse> {
    if (isDebugMode())
      console.info(
        'BackendService.upload: fileInputId = %s | options = %s',
        fileInputId,
        options,
      );
    const input = this.document.getElementById(
      fileInputId,
    ) as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return throwError(
        () => new Error(`No file selected in input #${fileInputId}`),
      );
    }
    const formData = new FormData();
    formData.append('file', file);
    return this.POST<UploadResponse>('upload', 'upload', formData, {}, options);
  }

  /**
   * Downloads the upload template file for this resource (used to pre-populate bulk upload sheets).
   *
   * @param queryParams - Optional query string parameters.
   * @param options - Optional request options.
   * @returns Observable emitting a {@link DownloadResponse}.
   */
  uploadTemplate(
    queryParams?: GenericType,
    options?: GenericType,
  ): Observable<DownloadResponse> {
    return this.DOWNLOAD_GET(
      'uploadTemplate',
      'upload/template',
      queryParams,
      options,
    );
  }

  /**
   * Downloads a data export for this resource.
   *
   * @param queryParams - Optional query string parameters (e.g. filters to scope the export).
   * @returns Observable emitting a {@link DownloadResponse}.
   */
  download(
    queryParams?: GenericType,
    options?: GenericType,
  ): Observable<DownloadResponse> {
    return this.DOWNLOAD_POST('download', 'download', queryParams, options);
  }

  /**
   * Creates multiple resources in a single request.
   *
   * @param objects - Array of write model payloads to create.
   * @param options - Optional request options.
   * @returns Observable emitting an array of created resources as read models.
   */
  bulkCreate(objects: $Q[], options?: GenericType): Observable<$S[]> {
    return this.POST<$S[]>('bulkCreate', 'bulk-create', objects, {}, options);
  }

  /**
   * Deletes multiple resources by their IDs in a single request.
   *
   * @param ids - Array of numeric IDs to delete.
   * @param options - Optional request options.
   * @returns Observable emitting a {@link BulkDeleteResponse} with the count of deleted records.
   */
  bulkDelete(
    ids: number[],
    options?: GenericType,
  ): Observable<BulkDeleteResponse> {
    return this.DELETE<BulkDeleteResponse>(
      'bulkDelete',
      'bulk-delete',
      { ids: ids },
      {},
      options,
    );
  }
}
