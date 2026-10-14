import {
  Signal,
  Injector,
  assertInInjectionContext,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  CrudDataSource,
  CrudFilter,
  ListRequest,
  ListResponse,
  ReadModel,
  WriteModel,
} from './crud.types';

/** Options for {@link createCrudList}. */
export interface CrudListOptions {
  readonly pageSize?: number;
  readonly orderBy?: string;
  readonly filter?: CrudFilter;
}

/** The presentation-free state of a token-paged resource list. */
export interface CrudList<
  $S extends ReadModel<$K>,
  $K extends string | number,
> {
  /** Items of the current page (empty until the first load). */
  readonly items: Signal<$S[]>;
  readonly loading: Signal<boolean>;
  /** The `HttpErrorResponse` (or other error) of the last load, unchanged. */
  readonly error: Signal<unknown>;
  readonly pageSize: Signal<number>;
  readonly orderBy: Signal<string | undefined>;
  readonly filter: Signal<CrudFilter>;
  /** Zero-based index of the current page in the visited-page stack. */
  readonly pageIndex: Signal<number>;
  readonly hasPrevious: Signal<boolean>;
  readonly hasNext: Signal<boolean>;
  /** Present only when the backend sends `totalSize`. */
  readonly totalSize: Signal<number | undefined>;
  /** Selected ids; pruned to ids still on the page after a load settles. */
  readonly selection: Signal<readonly $K[]>;

  next(): void;
  previous(): void;
  /** Re-fetches the current page (same token). */
  reload(): void;
  /** Changing order, filter or page size resets to the first page. */
  setOrderBy(orderBy: string | undefined): void;
  setFilter(filter: CrudFilter): void;
  setPageSize(pageSize: number): void;
  toggle(id: $K): void;
  select(ids: readonly $K[]): void;
  clearSelection(): void;
}

/**
 * Builds the list controller for a resource screen on Angular's `rxResource`:
 * a page-token stack (previous/next, reset when order, filter or page size
 * change), `orderBy` state, selection keyed by id and latest-request-wins
 * (the resource unsubscribes a superseded request).
 *
 * A function, not an injectable: the data source belongs to one screen, so
 * there is nothing to share through DI. Call it in an injection context, like
 * `inject()`, or pass `injector`.
 */
export function createCrudList<
  $Q extends WriteModel<$K>,
  $S extends ReadModel<$K>,
  $K extends string | number = number,
>(
  dataSource: Pick<CrudDataSource<$Q, $S, $K>, 'list'>,
  options: CrudListOptions & { injector?: Injector } = {},
): CrudList<$S, $K> {
  if (!options.injector) assertInInjectionContext(createCrudList);
  const injector = options.injector ?? inject(Injector);

  const pageSize = signal(options.pageSize ?? 25);
  const orderBy = signal(options.orderBy);
  const filter = signal<CrudFilter>(options.filter ?? {});
  // tokens[i] is the token that fetches page i; page 0 has none.
  const tokens = signal<(string | undefined)[]>([undefined]);
  const pageIndex = signal(0);

  const resource = rxResource<ListResponse<$S> | undefined, ListRequest>({
    injector,
    params: () => ({
      pageSize: pageSize(),
      pageToken: tokens()[pageIndex()],
      orderBy: orderBy(),
      filter: filter(),
    }),
    stream: ({ params }) => dataSource.list(params),
  });

  // `value()` throws while the resource is in the error state.
  const response = computed(() =>
    resource.hasValue() ? resource.value() : undefined,
  );
  const items = computed(() => response()?.items ?? []);
  const nextToken = computed(() => response()?.nextPageToken ?? null);

  const selection = linkedSignal<
    { items: $S[]; settled: boolean },
    readonly $K[]
  >({
    source: () => ({ items: items(), settled: !resource.isLoading() }),
    computation: ({ items, settled }, previous) => {
      if (!previous) return [];
      if (!settled) return previous.value;
      const present = new Set(items.map((item) => item.id));
      return previous.value.filter((id) => present.has(id));
    },
  });

  const reset = () => {
    tokens.set([undefined]);
    pageIndex.set(0);
  };

  return {
    items,
    loading: resource.isLoading,
    error: resource.error,
    pageSize: pageSize.asReadonly(),
    orderBy: orderBy.asReadonly(),
    filter: filter.asReadonly(),
    pageIndex: pageIndex.asReadonly(),
    hasPrevious: computed(() => pageIndex() > 0),
    hasNext: computed(() => nextToken() !== null),
    totalSize: computed(() => response()?.totalSize),
    selection,

    next() {
      const token = nextToken();
      if (token === null) return;
      const index = pageIndex() + 1;
      tokens.update((stack) => [...stack.slice(0, index), token]);
      pageIndex.set(index);
    },
    previous() {
      if (pageIndex() > 0) pageIndex.update((i) => i - 1);
    },
    reload: () => void resource.reload(),
    setOrderBy(value) {
      orderBy.set(value);
      reset();
    },
    setFilter(value) {
      filter.set(value);
      reset();
    },
    setPageSize(value) {
      pageSize.set(value);
      reset();
    },
    toggle(id) {
      selection.update((ids) =>
        ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
      );
    },
    select: (ids) => selection.set([...ids]),
    clearSelection: () => selection.set([]),
  };
}
