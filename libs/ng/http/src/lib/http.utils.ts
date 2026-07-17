// external imports
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';

// internal imports
import { DownloadResponse } from './http.types';

// global variables

/**
 * Class providing http utility functions
 */
export class HttpUtil {
  /**
   * Trims redundant slashes from a URL.
   *
   * This function takes a URL string as input and removes any redundant slashes,
   * ensuring that there is only one slash between each segment of the URL.
   *
   * @param url - The URL string to be trimmed.
   * @returns The trimmed URL string with redundant slashes removed.
   */
  public static trimURL(url: string): string {
    return url.replace(/([^:]\/)\/+/g, '$1');
  }

  /**
   * Triggers a browser download for a blob response received from the server.
   *
   * @param {DownloadResponse} response - The blob and filename parsed from the server response.
   */
  public static downloadFile(response: DownloadResponse): void {
    const url = URL.createObjectURL(response.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = response.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  public static parseDownloadResponse(
    response: HttpResponse<Blob>,
  ): DownloadResponse {
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    const fileName = match?.[1]?.replace(/['"]/g, '').trim() ?? 'download';
    if (!response.body) {
      throw new Error('Download response body is empty');
    }
    return { blob: response.body, fileName };
  }

  public static formatError(
    response: HttpErrorResponse,
    message?: string,
  ): string {
    return `${message ?? response.error?.message} [${response.error?.error}]`;
  }
}
