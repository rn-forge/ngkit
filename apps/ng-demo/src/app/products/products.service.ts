import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { GenericType } from '@rn-forge/ng/core';

/** Angular's `HttpParams` option type only accepts primitive/array values. */
type HttpParamsInit =
  | HttpParams
  | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;

function toHttpParams(params?: GenericType): HttpParamsInit | undefined {
  return params as HttpParamsInit | undefined;
}
import {
  BulkDeleteResponse,
  CrudDataSource,
  CrudFileDownload,
  ListResponse,
  UploadResponse,
} from '@rn-forge/ng-bootstrap/crud';
import { DEMO_API_URL } from '../shared/api.tokens';
import { ProductRead, ProductWrite } from './products.types';

/** Implements the demo `products` resource's data contract over native `HttpClient`. */
@Injectable({ providedIn: 'root' })
export class ProductsService
  implements CrudDataSource<ProductWrite, ProductRead>
{
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(DEMO_API_URL)}/products`;

  list(params?: GenericType): Observable<ListResponse<ProductRead>> {
    return this.http.get<ListResponse<ProductRead>>(`${this.url}/`, {
      params: toHttpParams(params),
    });
  }

  create(payload: ProductWrite): Observable<ProductRead> {
    return this.http.post<ProductRead>(`${this.url}/`, payload);
  }

  update(id: number, payload: ProductWrite): Observable<ProductRead> {
    return this.http.put<ProductRead>(`${this.url}/${id}/`, payload);
  }

  bulkDelete(ids: number[]): Observable<BulkDeleteResponse> {
    return this.http.delete<BulkDeleteResponse>(`${this.url}/bulk-delete/`, {
      body: { ids },
    });
  }

  upload(fieldName: string): Observable<UploadResponse> {
    const input = document.getElementById(
      fieldName,
    ) as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return throwError(
        () => new Error(`No file selected in input #${fieldName}`),
      );
    }
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResponse>(`${this.url}/upload/`, formData);
  }

  uploadTemplate(params?: GenericType): Observable<CrudFileDownload> {
    return this.http
      .get(`${this.url}/upload/template/`, {
        params: toHttpParams(params),
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(map(toFileDownload));
  }

  download(params?: GenericType): Observable<CrudFileDownload> {
    return this.http
      .post(`${this.url}/download/`, params, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(map(toFileDownload));
  }
}

function toFileDownload(response: HttpResponse<Blob>): CrudFileDownload {
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
  const fileName = match?.[1]?.replace(/['"]/g, '').trim() ?? 'download';
  if (!response.body) {
    throw new Error('Download response body is empty');
  }
  return { blob: response.body, fileName };
}
