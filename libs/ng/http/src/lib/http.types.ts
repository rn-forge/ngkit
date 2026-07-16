// external imports

// internal imports
import { GenericType } from '@rn-forge/ng/core';

/** Base Type for Requests - Can add common request attributes **/
export type BaseRequest = GenericType;

/** Base Type for Response - Can add common response attributes **/
export type BaseResponse = GenericType;

/**
 * Type interface for an error response.
 *
 * @extends BaseResponse
 *
 * @property {number} timestamp - The timestamp when the error occurred.
 * @property {number} status - The HTTP status code of the error.
 * @property {string} error - A short description of the error.
 * @property {string} message - A detailed message about the error.
 * @property {string} path - The path of the request that caused the error.
 */
export interface ErrorResponse extends BaseResponse {
  readonly timestamp: number;
  readonly status: number;
  readonly error: string;
  readonly message: string;
  readonly path: string;
}

/**
 * Represents a downloadable file returned from the server as a binary blob.
 *
 * @property {Blob} blob - The raw file content.
 * @property {string} fileName - The filename parsed from the Content-Disposition header.
 */
export interface DownloadResponse {
  readonly blob: Blob;
  readonly fileName: string;
}
