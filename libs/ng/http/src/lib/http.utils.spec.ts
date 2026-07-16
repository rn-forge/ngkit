import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { HttpUtil } from './http.utils';
import type { DownloadResponse } from './http.types';

// ---------------------------------------------------------------------------
// HttpUtil.trimURL
// ---------------------------------------------------------------------------

describe('HttpUtil.trimURL', () => {
  it('leaves a clean URL unchanged', () => {
    expect(HttpUtil.trimURL('http://example.com/api/v1')).toBe(
      'http://example.com/api/v1',
    );
  });

  it('collapses a double slash in the path', () => {
    expect(HttpUtil.trimURL('http://example.com//api/v1')).toBe(
      'http://example.com/api/v1',
    );
  });

  it('collapses multiple consecutive slashes in the path', () => {
    expect(HttpUtil.trimURL('http://example.com///api///v1')).toBe(
      'http://example.com/api/v1',
    );
  });

  it('collapses double slashes at multiple points in the path', () => {
    expect(HttpUtil.trimURL('https://example.com//api//v1//resource')).toBe(
      'https://example.com/api/v1/resource',
    );
  });

  it('preserves the http:// protocol double-slash', () => {
    expect(HttpUtil.trimURL('http://example.com/api')).toMatch(
      /^http:\/\/example\.com/,
    );
  });

  it('preserves the https:// protocol double-slash', () => {
    expect(HttpUtil.trimURL('https://example.com/api')).toMatch(
      /^https:\/\/example\.com/,
    );
  });

  it('preserves a trailing single slash', () => {
    expect(HttpUtil.trimURL('http://example.com/api/')).toBe(
      'http://example.com/api/',
    );
  });

  it('collapses double slashes in a path-only (relative) URL', () => {
    expect(HttpUtil.trimURL('/api//v1//resource')).toBe('/api/v1/resource');
  });

  it('returns an empty string unchanged', () => {
    expect(HttpUtil.trimURL('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// HttpUtil.downloadFile
// ---------------------------------------------------------------------------

describe('HttpUtil.downloadFile', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let capturedHref = '';
  let capturedDownload = '';

  beforeEach(() => {
    capturedHref = '';
    capturedDownload = '';
    createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        capturedHref = this.href;
        capturedDownload = this.download;
        return undefined;
      });
  });

  afterEach(() => vi.restoreAllMocks());

  const response: DownloadResponse = {
    blob: new Blob(['hello download'], { type: 'text/plain' }),
    fileName: 'test-file.txt',
  };

  it('calls URL.createObjectURL with the blob', () => {
    HttpUtil.downloadFile(response);
    expect(createObjectURLSpy).toHaveBeenCalledWith(response.blob);
  });

  it('sets the anchor href to the blob URL', () => {
    HttpUtil.downloadFile(response);
    expect(capturedHref).toContain('blob:mock-url');
  });

  it('sets the anchor download attribute to the file name', () => {
    HttpUtil.downloadFile(response);
    expect(capturedDownload).toBe('test-file.txt');
  });

  it('calls click() on the anchor element', () => {
    HttpUtil.downloadFile(response);
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('revokes the object URL after 100ms', () => {
    vi.useFakeTimers();
    HttpUtil.downloadFile(response);
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// HttpUtil.parseDownloadResponse
// ---------------------------------------------------------------------------

describe('HttpUtil.parseDownloadResponse', () => {
  function makeResponse(disposition: string | null): HttpResponse<Blob> {
    const headers = new HttpHeaders(
      disposition ? { 'Content-Disposition': disposition } : {},
    );
    return new HttpResponse({ body: new Blob(['data']), headers });
  }

  it('returns the blob from the response body', () => {
    const blob = new Blob(['data']);
    const res = new HttpResponse({ body: blob, headers: new HttpHeaders() });
    expect(HttpUtil.parseDownloadResponse(res).blob).toBe(blob);
  });

  it('extracts the filename from Content-Disposition', () => {
    const res = makeResponse('attachment; filename="report.csv"');
    expect(HttpUtil.parseDownloadResponse(res).fileName).toBe('report.csv');
  });

  it('extracts filename without quotes', () => {
    const res = makeResponse('attachment; filename=report.csv');
    expect(HttpUtil.parseDownloadResponse(res).fileName).toBe('report.csv');
  });

  it('defaults to "download" when Content-Disposition is absent', () => {
    const res = makeResponse(null);
    expect(HttpUtil.parseDownloadResponse(res).fileName).toBe('download');
  });

  it('defaults to "download" when filename is missing from header', () => {
    const res = makeResponse('attachment');
    expect(HttpUtil.parseDownloadResponse(res).fileName).toBe('download');
  });
});

// ---------------------------------------------------------------------------
// HttpUtil.formatError
// ---------------------------------------------------------------------------

describe('HttpUtil.formatError', () => {
  const response = {
    error: { message: 'Not found', error: 'NOT_FOUND' },
  } as unknown as import('@angular/common/http').HttpErrorResponse;

  it('formats message and error code from response', () => {
    expect(HttpUtil.formatError(response)).toBe('Not found [NOT_FOUND]');
  });

  it('uses custom message when provided', () => {
    expect(HttpUtil.formatError(response, 'Custom msg')).toBe(
      'Custom msg [NOT_FOUND]',
    );
  });
});
