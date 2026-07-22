// external imports
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// internal imports
import { GenericType, isDebugMode } from '@rn-forge/ng/core';
import { RN_FORGE_HTTP_CONFIG_TOKEN, RnForgeHttpConfig } from './http.config';
import { DownloadResponse } from './http.types';
import { HttpUtil } from './http.utils';

/**
 * Abstract base class for Angular HTTP services. Wraps `HttpClient` with a typed,
 * operation-named API and automatic error handling.
 *
 * Extend this class and call the protected `GET`, `POST`, `PUT`, `DELETE`,
 * `DOWNLOAD_GET`, or `DOWNLOAD_POST` helpers. Each method accepts an `opName` used
 * in error/debug logs so call-site context is preserved.
 *
 * The `apiRoot` constructor argument is appended to `RnForgeHttpConfig.apiBasePath`
 * to form the service's base URL (e.g. `apiBasePath='/api'` + `apiRoot='products'`
 * → base path `/api/products/`).
 *
 * @example
 * ```ts
 * @Injectable({ providedIn: 'root' })
 * export class ProductsHttpService extends AbstractHTTPService {
 *   constructor() { super('products'); }
 *
 *   getAll() { return this.GET<Product[]>('getAll', ''); }
 *   create(p: Product) { return this.POST<Product>('create', '', p); }
 * }
 * ```
 */
export abstract class AbstractHTTPService {
  protected readonly httpConfig: RnForgeHttpConfig = inject(
    RN_FORGE_HTTP_CONFIG_TOKEN,
  );

  private _basePath: string;
  private readonly _httpClient: HttpClient;

  constructor(apiRoot = '') {
    this._basePath = HttpUtil.trimURL(
      `${this.httpConfig.apiBasePath}/${apiRoot}/`,
    );
    this._httpClient = inject(HttpClient);
  }

  protected updateBasePath(value: string) {
    this._basePath = HttpUtil.trimURL(value);
  }

  protected getEndpoint(apiSuffix?: string): string {
    const endpoint =
      !apiSuffix || apiSuffix === ''
        ? `${this._basePath}/`
        : `${this._basePath}/${apiSuffix}/`;
    return HttpUtil.trimURL(endpoint);
  }

  protected get httpClient(): HttpClient {
    return this._httpClient;
  }

  protected handleError(operation: string) {
    return (response: HttpErrorResponse): Observable<never> => {
      console.error('HttpService.%s.ERROR: %O', operation, response);
      return throwError(() => response);
    };
  }

  protected getQueryString(queryParams?: GenericType): string {
    return queryParams
      ? `?${Object.keys(queryParams)
          .map((key) => `${key}=${queryParams[key]}`)
          .join('&')}`
      : '';
  }

  protected GET<T>(
    opName: string,
    apiPath: string,
    queryParams?: GenericType,
    options?: GenericType,
  ) {
    const queryString = this.getQueryString(queryParams);
    if (isDebugMode()) {
      console.debug(
        'HttpService.GET (%s): %s%s | %s',
        opName,
        apiPath,
        queryString,
        options,
      );
    }
    return this.httpClient
      .get<T>(`${this.getEndpoint(apiPath)}${queryString}`, options)
      .pipe(catchError(this.handleError(opName)));
  }

  protected POST<T>(
    opName: string,
    apiPath: string,
    body: unknown,
    queryParams?: GenericType,
    options?: GenericType,
  ) {
    const queryString = this.getQueryString(queryParams);
    if (isDebugMode()) {
      console.debug(
        'HttpService.POST (%s): %s%s | %s',
        opName,
        apiPath,
        queryString,
        options,
      );
    }
    return this.httpClient
      .post<T>(`${this.getEndpoint(apiPath)}${queryString}`, body, options)
      .pipe(catchError(this.handleError(opName)));
  }

  protected PUT<T>(
    opName: string,
    apiPath: string,
    body: unknown,
    queryParams?: GenericType,
    options?: GenericType,
  ) {
    const queryString = this.getQueryString(queryParams);
    if (isDebugMode()) {
      console.debug(
        'HttpService.PUT (%s): %s%s | %s',
        opName,
        apiPath,
        queryString,
        options,
      );
    }
    return this.httpClient
      .put<T>(`${this.getEndpoint(apiPath)}${queryString}`, body, options)
      .pipe(catchError(this.handleError(opName)));
  }

  protected DELETE<T>(
    opName: string,
    apiPath: string,
    body?: unknown,
    queryParams?: GenericType,
    options?: GenericType,
  ) {
    const queryString = this.getQueryString(queryParams);
    if (isDebugMode()) {
      console.debug(
        'HttpService.DELETE (%s): %s%s | %s',
        opName,
        apiPath,
        queryString,
        options,
      );
    }
    if (body) {
      options = options ?? {};
      options['body'] = body;
    }
    return this.httpClient
      .delete<T>(`${this.getEndpoint(apiPath)}${queryString}`, options)
      .pipe(catchError(this.handleError(opName)));
  }

  protected DOWNLOAD_GET(
    opName: string,
    apiPath: string,
    queryParams?: GenericType,
    options?: GenericType,
  ): Observable<DownloadResponse> {
    const queryString = this.getQueryString(queryParams);
    if (isDebugMode())
      console.debug(
        'HttpService.DOWNLOAD_GET (%s): %s%s',
        opName,
        apiPath,
        queryString,
      );
    return this.httpClient
      .get(`${this.getEndpoint(apiPath)}${queryString}`, {
        ...options,
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map(HttpUtil.parseDownloadResponse),
        catchError(this.handleError(opName)),
      );
  }

  protected DOWNLOAD_POST(
    opName: string,
    apiPath: string,
    body: unknown,
    queryParams?: GenericType,
    options?: GenericType,
  ): Observable<DownloadResponse> {
    const queryString = this.getQueryString(queryParams);
    if (isDebugMode())
      console.debug(
        'HttpService.DOWNLOAD_POST (%s): %s%s',
        opName,
        apiPath,
        queryString,
      );
    return this.httpClient
      .post(`${this.getEndpoint(apiPath)}${queryString}`, body, {
        ...options,
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map(HttpUtil.parseDownloadResponse),
        catchError(this.handleError(opName)),
      );
  }
}
