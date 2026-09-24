import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of } from 'rxjs';
import { createCrudList } from './crud.list';
import { ListRequest, ListResponse, ReadModel } from './crud.types';

type Row = ReadModel<number>;

const page = (
  ids: number[],
  nextPageToken: string | null,
  totalSize?: number,
): ListResponse<Row> => ({
  items: ids.map((id) => ({ id })),
  nextPageToken,
  totalSize,
});

/** Data source serving three pages of two rows, recording each request. */
function pagedSource() {
  const requests: ListRequest[] = [];
  const pages: Record<string, ListResponse<Row>> = {
    first: page([1, 2], 't2'),
    t2: page([3, 4], 't3'),
    t3: page([5, 6], null),
  };
  return {
    requests,
    list: (request: ListRequest): Observable<ListResponse<Row>> => {
      requests.push(request);
      return of(pages[request.pageToken ?? 'first']);
    },
  };
}

const settle = async () => {
  TestBed.tick();
  await Promise.resolve();
  TestBed.tick();
};

describe('createCrudList', () => {
  it('pages next and previous across three pages', async () => {
    const source = pagedSource();
    const list = TestBed.runInInjectionContext(() => createCrudList(source));
    await settle();
    expect(list.items().map((r) => r.id)).toEqual([1, 2]);
    expect(list.hasPrevious()).toBe(false);
    expect(list.hasNext()).toBe(true);

    list.next();
    await settle();
    expect(list.items().map((r) => r.id)).toEqual([3, 4]);
    list.next();
    await settle();
    expect(list.items().map((r) => r.id)).toEqual([5, 6]);
    expect(list.hasNext()).toBe(false);
    expect(list.pageIndex()).toBe(2);

    list.next(); // no-op on the last page
    expect(list.pageIndex()).toBe(2);

    list.previous();
    await settle();
    expect(list.items().map((r) => r.id)).toEqual([3, 4]);
    list.previous();
    await settle();
    expect(list.items().map((r) => r.id)).toEqual([1, 2]);
    list.previous(); // no-op on the first page
    expect(list.pageIndex()).toBe(0);
    expect(source.requests.map((r) => r.pageToken)).toEqual([
      undefined,
      't2',
      't3',
      't2',
      undefined,
    ]);
  });

  it('resets to the first page on orderBy, filter and page size change', async () => {
    const source = pagedSource();
    const list = TestBed.runInInjectionContext(() =>
      createCrudList(source, { pageSize: 2 }),
    );
    await settle();
    list.next();
    await settle();
    expect(list.pageIndex()).toBe(1);

    list.setOrderBy('name desc');
    await settle();
    expect(list.pageIndex()).toBe(0);
    expect(source.requests.at(-1)).toMatchObject({
      orderBy: 'name desc',
      pageToken: undefined,
    });

    list.next();
    await settle();
    list.setFilter({ status: 'open' });
    await settle();
    expect(list.pageIndex()).toBe(0);
    expect(source.requests.at(-1)?.filter).toEqual({ status: 'open' });

    list.next();
    await settle();
    list.setPageSize(10);
    await settle();
    expect(list.pageIndex()).toBe(0);
    expect(source.requests.at(-1)?.pageSize).toBe(10);
  });

  it('lets a delayed older response never overwrite a newer one', async () => {
    const subjects: Subject<ListResponse<Row>>[] = [];
    const list = TestBed.runInInjectionContext(() =>
      createCrudList<never, Row, number>({
        list: () => {
          const s = new Subject<ListResponse<Row>>();
          subjects.push(s);
          return s;
        },
      }),
    );
    await settle();
    list.setOrderBy('name');
    await settle();
    expect(subjects).toHaveLength(2);

    subjects[1].next(page([2], null));
    await settle();
    subjects[0].next(page([1], null)); // older response arrives late
    await settle();
    expect(list.items().map((r) => r.id)).toEqual([2]);
  });

  it('keeps selection on reload only for ids still present', async () => {
    let rows = [1, 2, 3];
    const list = TestBed.runInInjectionContext(() =>
      createCrudList<never, Row, number>({
        list: () => of(page(rows, null)),
      }),
    );
    await settle();
    list.select([1, 2]);
    list.toggle(3);
    list.toggle(2);
    expect(list.selection()).toEqual([1, 3]);

    rows = [1, 4];
    list.reload();
    await settle();
    expect(list.selection()).toEqual([1]);

    list.clearSelection();
    expect(list.selection()).toEqual([]);
  });

  it('exposes totalSize only when the backend sends it', async () => {
    let total = undefined as number | undefined;
    const list = TestBed.runInInjectionContext(() =>
      createCrudList<never, Row, number>({
        list: () => of(page([1], null, total)),
      }),
    );
    await settle();
    expect(list.totalSize()).toBeUndefined();

    total = 42;
    list.reload();
    await settle();
    expect(list.totalSize()).toBe(42);
  });

  it('surfaces a failed load as the unchanged error', async () => {
    const boom = new Error('boom');
    const list = TestBed.runInInjectionContext(() =>
      createCrudList<never, Row, number>({
        list: () => new Observable<ListResponse<Row>>((s) => s.error(boom)),
      }),
    );
    await settle();
    expect(list.error()).toBe(boom);
    expect(list.items()).toEqual([]);
  });

  it('requires an injection context or an injector', () => {
    expect(() => createCrudList({ list: () => of(page([], null)) })).toThrow();
    expect(() =>
      createCrudList(
        { list: () => of(page([], null)) },
        { injector: TestBed.inject(Injector) },
      ),
    ).not.toThrow();
  });
});
