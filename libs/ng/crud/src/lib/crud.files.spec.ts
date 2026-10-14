import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { crudFeatures, fileNameFrom, IdempotencyKey } from './crud.files';
import { CrudDataSource } from './crud.types';

const responseWith = (disposition?: string) =>
  new HttpResponse<Blob>({
    body: new Blob(['x']),
    headers: disposition
      ? new HttpHeaders({ 'Content-Disposition': disposition })
      : undefined,
  });

describe('fileNameFrom', () => {
  it('reads a quoted filename', () => {
    expect(
      fileNameFrom(responseWith('attachment; filename="orders.csv"')),
    ).toBe('orders.csv');
  });

  it('decodes an RFC 8187 filename*', () => {
    expect(
      fileNameFrom(
        responseWith("attachment; filename*=UTF-8''na%C3%AFve%20%E2%82%AC.csv"),
      ),
    ).toBe('naïve €.csv');
  });

  it('prefers filename* when both are present', () => {
    expect(
      fileNameFrom(
        responseWith(
          'attachment; filename="fallback.csv"; filename*=UTF-8\'\'r%C3%A9el.csv',
        ),
      ),
    ).toBe('réel.csv');
  });

  it('falls back when the header is missing, empty of a filename or malformed', () => {
    expect(fileNameFrom(responseWith())).toBe('download');
    expect(fileNameFrom(responseWith(), 'orders.csv')).toBe('orders.csv');
    expect(fileNameFrom(responseWith('attachment'))).toBe('download');
    expect(fileNameFrom(responseWith('%%% not; a; header ==='))).toBe(
      'download',
    );
  });
});

describe('IdempotencyKey', () => {
  it('reuses the key across retries and renews after reset', () => {
    const key = new IdempotencyKey();
    const first = key.get();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(key.get()).toBe(first);

    key.reset();
    const second = key.get();
    expect(second).not.toBe(first);
    expect(key.get()).toBe(second);
  });
});

describe('crudFeatures', () => {
  const base = {
    list: () => of({ items: [], nextPageToken: null }),
    get: () => of({ value: { id: 1 } }),
    create: () => of({ value: { id: 1 } }),
    update: () => of({ value: { id: 1 } }),
    delete: () => of(undefined),
  } as unknown as CrudDataSource<{ id?: number }, { id: number }, number>;

  it('reports only the optional methods present', () => {
    expect(crudFeatures(base)).toEqual({
      batchDelete: false,
      import: false,
      importTemplate: false,
      export: false,
    });
    expect(
      crudFeatures({ ...base, batchDelete: () => of(undefined) }),
    ).toMatchObject({ batchDelete: true, import: false });
  });
});
