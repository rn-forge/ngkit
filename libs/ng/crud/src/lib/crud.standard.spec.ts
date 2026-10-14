import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { standardDataSource } from './crud.standard';
import { CrudDataSource, ReadModel, WriteModel } from './crud.types';

type Order = ReadModel<string> & { name: string };
type OrderInput = WriteModel<string> & { name?: string };
type Source = CrudDataSource<OrderInput, Order, string>;

const config = { baseUrl: 'https://api.test', collection: '/orders' };

function setup(
  features?: Parameters<typeof standardDataSource>[0]['features'],
) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const source = TestBed.runInInjectionContext(() =>
    standardDataSource<OrderInput, Order, string>({ ...config, features }),
  );
  return { source, http: TestBed.inject(HttpTestingController) };
}

describe('standardDataSource', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lists with paging, order and filter params', () => {
    const { source, http } = setup();
    let result: unknown;
    source
      .list({
        pageSize: 10,
        pageToken: 'abc',
        orderBy: 'name desc',
        filter: {
          status: 'open',
          tag: ['a', 'b'],
          skip: undefined,
          gone: null,
        },
      })
      .subscribe((r) => (result = r));

    const req = http.expectOne((r) => r.url === 'https://api.test/orders');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.getAll('pageSize')).toEqual(['10']);
    expect(req.request.params.getAll('pageToken')).toEqual(['abc']);
    expect(req.request.params.getAll('orderBy')).toEqual(['name desc']);
    expect(req.request.params.getAll('status')).toEqual(['open']);
    expect(req.request.params.getAll('tag')).toEqual(['a', 'b']);
    expect(req.request.params.has('skip')).toBe(false);
    expect(req.request.params.has('gone')).toBe(false);
    req.flush({ items: [{ id: '1' }], nextPageToken: null });
    expect(result).toEqual({ items: [{ id: '1' }], nextPageToken: null });
  });

  it('omits unset paging params', () => {
    const { source, http } = setup();
    source.list({}).subscribe();
    const req = http.expectOne('https://api.test/orders');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ items: [], nextPageToken: null });
  });

  it('gets by encoded id and reads the ETag into Versioned', () => {
    const { source, http } = setup();
    let result: unknown;
    source.get('a/b c').subscribe((r) => (result = r));
    const req = http.expectOne('https://api.test/orders/a%2Fb%20c');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'a/b c', name: 'x' }, { headers: { ETag: '"v1"' } });
    expect(result).toEqual({ value: { id: 'a/b c', name: 'x' }, etag: '"v1"' });
  });

  it('leaves etag undefined when the response has none', () => {
    const { source, http } = setup();
    let result: { etag?: string } | undefined;
    source.get('1').subscribe((r) => (result = r));
    http.expectOne('https://api.test/orders/1').flush({ id: '1' });
    expect(result?.etag).toBeUndefined();
  });

  it('creates with an Idempotency-Key only when given', () => {
    const { source, http } = setup();
    source.create({ name: 'n' }, { idempotencyKey: 'key-1' }).subscribe();
    let req = http.expectOne('https://api.test/orders');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'n' });
    expect(req.request.headers.get('Idempotency-Key')).toBe('key-1');
    req.flush({ id: '1', name: 'n' }, { headers: { ETag: '"e"' } });

    source.create({ name: 'n' }).subscribe();
    req = http.expectOne('https://api.test/orders');
    expect(req.request.headers.has('Idempotency-Key')).toBe(false);
    req.flush({ id: '2', name: 'n' });
  });

  it('patches with merge-patch content type and If-Match from the etag', () => {
    const { source, http } = setup();
    let result: unknown;
    source
      .update('1', { name: 'y' }, { etag: '"v1"' })
      .subscribe((r) => (result = r));
    const req = http.expectOne('https://api.test/orders/1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.headers.get('Content-Type')).toBe(
      'application/merge-patch+json',
    );
    expect(req.request.headers.get('If-Match')).toBe('"v1"');
    expect(req.request.body).toEqual({ name: 'y' });
    req.flush({ id: '1', name: 'y' }, { headers: { ETag: '"v2"' } });
    expect(result).toEqual({ value: { id: '1', name: 'y' }, etag: '"v2"' });
  });

  it('sends no If-Match without an etag', () => {
    const { source, http } = setup();
    source.update('1', { name: 'y' }).subscribe();
    const req = http.expectOne('https://api.test/orders/1');
    expect(req.request.headers.has('If-Match')).toBe(false);
    req.flush({ id: '1', name: 'y' });
  });

  it('deletes by encoded id and completes with void', () => {
    const { source, http } = setup();
    let value: unknown = 'unset';
    source.delete('a b').subscribe((v) => (value = v));
    const req = http.expectOne('https://api.test/orders/a%20b');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(value).toBeUndefined();
  });

  it('provides optional methods only when enabled', () => {
    const none = setup().source;
    expect(none.batchDelete).toBeUndefined();
    expect(none.import).toBeUndefined();
    expect(none.importTemplate).toBeUndefined();
    expect(none.export).toBeUndefined();
  });

  it('does not provide export for an empty format list', () => {
    expect(setup({ export: [] }).source.export).toBeUndefined();
  });

  it('batch-deletes with POST :batchDelete { ids }', () => {
    const { source, http } = setup({ batchDelete: true });
    let value: unknown = 'unset';
    source.batchDelete?.(['1', '2']).subscribe((v) => (value = v));
    const req = http.expectOne('https://api.test/orders:batchDelete');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ids: ['1', '2'] });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(value).toBeUndefined();
  });

  it('imports multipart with validateOnly only when true', () => {
    const { source, http } = setup({ import: true });
    const file = new File(['a,b'], 'rows.csv', { type: 'text/csv' });
    const report = { created: 1, updated: 0, skipped: 0, validateOnly: true };
    let result: unknown;
    source
      .import?.(file, { validateOnly: true })
      .subscribe((r) => (result = r));
    let req = http.expectOne((r) => r.url === 'https://api.test/orders:import');
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('validateOnly')).toBe('true');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush(report);
    expect(result).toEqual(report);

    source.import?.(file, { validateOnly: false }).subscribe();
    req = http.expectOne((r) => r.url === 'https://api.test/orders:import');
    expect(req.request.params.has('validateOnly')).toBe(false);
    req.flush({ ...report, validateOnly: false });
  });

  it('downloads the import template with prefill and filter params', () => {
    const { source, http } = setup({ importTemplate: true });
    let result: { blob: Blob; fileName: string } | undefined;
    source
      .importTemplate?.({ status: 'open' }, { prefill: true })
      .subscribe((r) => (result = r));
    const req = http.expectOne(
      (r) => r.url === 'https://api.test/orders:importTemplate',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('prefill')).toBe('true');
    expect(req.request.params.get('status')).toBe('open');
    req.flush(new Blob(['h1,h2']), {
      headers: { 'Content-Disposition': 'attachment; filename="template.csv"' },
    });
    expect(result?.fileName).toBe('template.csv');
    expect(result?.blob).toBeInstanceOf(Blob);

    source.importTemplate?.({}, { prefill: false }).subscribe();
    const plain = http.expectOne(
      (r) => r.url === 'https://api.test/orders:importTemplate',
    );
    expect(plain.request.params.has('prefill')).toBe(false);
    plain.flush(new Blob([]));
  });

  it('exports with GET, Accept and filter params, naming the file', () => {
    const { source, http } = setup({ export: ['text/csv'] });
    let result: { fileName: string } | undefined;
    source
      .export?.('text/csv', { status: 'open' })
      .subscribe((r) => (result = r));
    const req = http.expectOne((r) => r.url === 'https://api.test/orders');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Accept')).toBe('text/csv');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('status')).toBe('open');
    req.flush(new Blob(['x']), {
      headers: {
        'Content-Disposition': "attachment; filename*=UTF-8''o%20k.csv",
      },
    });
    expect(result?.fileName).toBe('o k.csv');
  });

  it('falls back to a default file name without Content-Disposition', () => {
    const { source, http } = setup({ export: ['text/csv'] });
    let result: { fileName: string } | undefined;
    source.export?.('text/csv', {}).subscribe((r) => (result = r));
    http.expectOne('https://api.test/orders').flush(new Blob(['x']));
    expect(result?.fileName).toBe('download');
  });

  it('passes 412 and 422 errors through unchanged', () => {
    const { source, http } = setup();
    const errors: unknown[] = [];
    source
      .update('1', {}, { etag: '"old"' })
      .subscribe({ error: (e) => errors.push(e) });
    http
      .expectOne('https://api.test/orders/1')
      .flush(
        { title: 'Precondition Failed' },
        { status: 412, statusText: 'Precondition Failed' },
      );
    source.create({}).subscribe({ error: (e) => errors.push(e) });
    http
      .expectOne('https://api.test/orders')
      .flush(
        { errors: [{ pointer: '/name', detail: 'bad' }] },
        { status: 422, statusText: 'Unprocessable' },
      );

    expect(errors.map((e) => (e as HttpErrorResponse).status)).toEqual([
      412, 422,
    ]);
    expect((errors[1] as HttpErrorResponse).error).toEqual({
      errors: [{ pointer: '/name', detail: 'bad' }],
    });
  });

  it('fails without baseUrl or collection', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    for (const bad of [
      { collection: '/orders' },
      { baseUrl: 'https://api.test' },
      { baseUrl: '', collection: '' },
    ]) {
      expect(() =>
        TestBed.runInInjectionContext(() =>
          standardDataSource(bad as { baseUrl: string; collection: string }),
        ),
      ).toThrow(/\[rn-forge\.ng\.crud\]/);
    }
  });
});

export type { Source };
