// external imports
import { HttpErrorResponse } from '@angular/common/http';
import {
  DestroyRef,
  Injectable,
  Injector,
  effect,
  inject,
  runInInjectionContext,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RNF_PERMISSION } from '@rn-forge/ng/auth';
import { merge } from 'lodash-es';
import { Observable, forkJoin, map } from 'rxjs';

// internal imports
import { GenericType, AppUtil, isDebugMode } from '@rn-forge/ng/core';
import {
  CrudDataSource,
  CrudFileDownload,
  CrudFilter,
  CrudList,
  IdempotencyKey,
  ImportReport,
  ReadModel,
  WriteModel,
  createCrudList,
  crudErrorKind,
  crudFeatures,
  problemOf,
  problemToFormErrors,
} from '@rn-forge/ng/crud';
import { FormOptions } from '@rn-forge/ng-bootstrap/form';
import {
  ColumnOptions,
  ModalOptions,
  TableOptions,
  ToolbarHelper,
} from '@rn-forge/ng-bootstrap';
import {
  CrudComponentMode,
  CrudContext,
  CrudOptions,
  CrudFilterField,
} from './crud.types';

/** Outcome of an import step, shown in the import view. */
export interface ImportOutcome {
  readonly report?: ImportReport;
  /** Row errors from a 422 (or the partial-save 200), one line each. */
  readonly errors: string[];
  /** `true` when a `validateOnly` pass succeeded, so the import can be committed. */
  readonly canCommit: boolean;
}

/**
 * Abstract base class that renders a `CrudDataSource` in a `CrudComponent`. It
 * holds no data logic: paging, ordering, filtering and selection come from the
 * `@rn-forge/ng/crud` list controller ({@link AbstractCrudManager.list}),
 * and RFC 9457 problems, 412 conflicts, idempotency keys and file names from
 * the same entry point. This class wires those to the table, forms and dialogs.
 *
 * Extend it per resource, provide it in the page component and pass it to
 * `<rnf-crud [manager]="manager" />`:
 *
 * ```ts
 * @Injectable()
 * export class ProductsManager extends AbstractCrudManager<ProductWrite, ProductRead> {
 *   readonly name = 'Product';
 *   permissionKey = 'products';
 *
 *   override readonly dataSource = standardDataSource<ProductWrite, ProductRead>({
 *     baseUrl: inject(API_URL),
 *     collection: '/products',
 *     features: { batchDelete: true, import: true, export: ['text/csv'] },
 *   });
 *
 *   tableColumns(): ColumnOptions[] {
 *     return [
 *       { field: 'id', title: 'ID' },
 *       { field: 'name', title: 'Name', sortable: true },
 *     ];
 *   }
 *   addUpdateFormControls() { return { name: ['', Validators.required] }; }
 *   toAddUpdateFormValue(data: ProductRead): ProductWrite { return { id: data.id, name: data.name }; }
 * }
 * ```
 *
 * Only columns marked `sortable` write `orderBy`, and only filters returned by
 * {@link filterFields} are sent. Optional data-source methods (`batchDelete`,
 * `import`, `importTemplate`, `export`) hide their action when absent.
 *
 * Permission checks use `RNF_PERMISSION` with keys `<permissionKey>.list`,
 * `.create`, `.update`, `.delete`, `.import`, `.export`.
 *
 * @template $Q Write model (request payload), extends {@link WriteModel}.
 * @template $S Read model (response payload), extends {@link ReadModel}.
 * @template $K Resource ID type, `number` or `string`.
 */
@Injectable()
export abstract class AbstractCrudManager<
  $Q extends WriteModel<$K>,
  $S extends ReadModel<$K>,
  $K extends string | number = number,
> {
  private readonly permissionService = inject(RNF_PERMISSION);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private ctx: CrudContext | undefined;
  private _list: CrudList<$S, $K> | undefined;
  private _tableOptions: Partial<TableOptions> | undefined;
  private _addUpdateMode: 'add' | 'update' = 'add';
  private editing: { id: $K; etag?: string } | undefined;
  private readonly idempotencyKey = new IdempotencyKey();
  private lastCreatePayload = '';
  private selectionAttached = false;
  private filterValues: CrudFilter = {};

  readonly currentMode = signal<CrudComponentMode>('list');
  /** `true` after a 412: the row changed on the server; offer {@link reloadConflict}. */
  readonly conflict = signal(false);
  readonly importFile = signal<File | undefined>(undefined);
  readonly importOutcome = signal<ImportOutcome | undefined>(undefined);

  /** Display name for the resource (e.g. `'Product'`). Used in alert messages and form headers. */
  abstract readonly name: string;
  /** Dot-notation permission key prefix (e.g. `'products'` → checks `products.list`, `products.create`, etc.). Set to `''` to bypass all permission checks. */
  abstract permissionKey: string;

  /** The `CrudDataSource` for this resource, e.g. from `standardDataSource()`. */
  abstract get dataSource(): CrudDataSource<$Q, $S, $K>;
  /** Returns the `ColumnOptions[]` for the list table; `sortable: true` columns write `orderBy`. */
  abstract tableColumns(): ColumnOptions[];
  /** Returns the reactive-form controls map for the add/update form. */
  abstract addUpdateFormControls(): GenericType;
  /** Converts a read-model row into the write-model shape for pre-filling the update form. */
  abstract toAddUpdateFormValue(data: $S): $Q;

  /** Page size requested from the backend. */
  protected pageSize = 10;
  /** `Accept` type for the export download. */
  protected exportFormat = 'text/csv';

  get pluralName(): string {
    return `${this.name}s`;
  }

  /** Filters (named query parameters) shown above the table. None by default. */
  filterFields(): readonly CrudFilterField[] {
    return [];
  }

  /** `true` once {@link init} has created the list controller. */
  hasList(): boolean {
    return this._list !== undefined;
  }

  /** The list controller; available once the component has called {@link init}. */
  get list(): CrudList<$S, $K> {
    if (!this._list) {
      throw new Error(
        'AbstractCrudManager.init() must be called before any operation',
      );
    }
    return this._list;
  }

  init(ctx: CrudContext): void {
    this.ctx = ctx;
    runInInjectionContext(this.injector, () => {
      this._list = createCrudList(this.dataSource, {
        pageSize: this.pageSize,
        injector: this.injector,
      });
      this.bindTable(ctx);
    });
  }

  /** Mirrors controller state into the table: rows, loading, load errors. */
  private bindTable(ctx: CrudContext): void {
    const list = this.list;
    effect(() => {
      if (!ctx.listTable.rendered) return;
      this.attachSelection(ctx);
      const items = list.items();
      ctx.listTable.load(items);
      const selected = untracked(list.selection);
      if (selected.length) {
        ctx.listTable.bootstrapTable('checkBy', {
          field: 'id',
          values: selected,
        });
      }
    });
    effect(() => {
      if (!ctx.listTable.rendered) return;
      if (list.loading()) ctx.listTable.bootstrapTable('showLoading');
    });
    effect(() => {
      const error = list.error();
      if (error) untracked(() => ctx.alert.error(this.errorMessage(error)));
    });
  }

  /** Feeds table check events back to the controller's selection (once). */
  private attachSelection(ctx: CrudContext): void {
    if (this.selectionAttached) return;
    this.selectionAttached = true;
    ctx.listTable.table.on(
      'check.bs.table.crud uncheck.bs.table.crud check-all.bs.table.crud uncheck-all.bs.table.crud',
      () =>
        this.list.select(
          ctx.listTable.getSelectedRows<$S>().map((row) => row.id),
        ),
    );
  }

  private requireCtx(): CrudContext {
    if (!this.ctx) {
      throw new Error(
        'AbstractCrudManager.init() must be called before any operation',
      );
    }
    return this.ctx;
  }

  protected get addUpdateForm() {
    return this.requireCtx().addUpdateForm;
  }
  protected get deleteModal() {
    return this.requireCtx().deleteModal;
  }
  protected get alert() {
    return this.requireCtx().alert;
  }
  protected get config(): CrudOptions {
    return (this.ctx?.config() ?? {
      list: {},
      addUpdate: {},
      delete: {},
    }) as CrudOptions;
  }

  protected checkPermission(suffix: string): boolean {
    if (!this.permissionKey) return true;
    const access = this.permissionService.hasPermission(
      `${this.permissionKey}.${suffix}`,
    );
    if (isDebugMode()) {
      console.debug(
        'Permission check: %s.%s = %s',
        this.permissionKey,
        suffix,
        access,
      );
    }
    return access;
  }

  enableList(): boolean {
    return this.checkPermission('list');
  }
  enableAdd(): boolean {
    return this.checkPermission('create');
  }
  enableUpdate(): boolean {
    return this.checkPermission('update');
  }
  enableAddUpdate(): boolean {
    return this.enableAdd() || this.enableUpdate();
  }
  enableDelete(): boolean {
    return this.checkPermission('delete');
  }
  enableImport(): boolean {
    return this.features.import && this.checkPermission('import');
  }
  enableExport(): boolean {
    return this.features.export && this.checkPermission('export');
  }
  /** Both template downloads need `importTemplate`. */
  enableImportTemplate(): boolean {
    return this.features.importTemplate;
  }

  private get features() {
    return crudFeatures(this.dataSource);
  }

  /**
   * Renders an error as a user-facing message: the problem's `detail` (else
   * `title`) when the body is an RFC 9457 problem, otherwise the response's
   * `message`. Override for an application-specific body.
   */
  protected errorMessage(error: unknown): string {
    const problem = problemOf(error);
    const summary = problem?.detail ?? problem?.title;
    if (summary) return summary;
    if (error instanceof HttpErrorResponse || error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  handleErrorResponse(error: unknown, message?: string): void {
    this.alert.error(message ?? this.errorMessage(error));
  }

  protected updateCurrentMode(mode: CrudComponentMode): void {
    if (isDebugMode()) console.debug(`${this.name}.mode:`, mode);
    this.currentMode.set(mode);
    this.ctx?.alert.hide();
  }

  tableOptions(): Partial<TableOptions> {
    if (this._tableOptions) return this._tableOptions;
    this._tableOptions = merge(
      {
        columns: this.tableColumns(),
        // The backend pages, sorts and filters; the table only renders a page.
        sidePagination: 'server',
        pagination: false,
        search: false,
        showRefresh: false,
        showPaginationSwitch: false,
        mobileResponsive: false,
        onSort: (field: string, order: string) =>
          this.list.setOrderBy(order === 'desc' ? `${field} desc` : field),
        formatNoMatches: () => 'No Records found',
        toolbarButtons: [
          ...(this.enableAdd()
            ? [ToolbarHelper.addButton(() => this.startAdd())]
            : []),
          ...(this.enableUpdate()
            ? [ToolbarHelper.updateButton(() => this.startUpdate())]
            : []),
          ...(this.enableDelete()
            ? [ToolbarHelper.deleteButton(() => this.startDelete())]
            : []),
          ...(this.enableImport()
            ? [
                {
                  ...ToolbarHelper.uploadButton(() => this.startImport()),
                  label: 'Import',
                },
              ]
            : []),
          ...(this.enableExport()
            ? [
                {
                  ...ToolbarHelper.downloadButton(() => this.submitExport()),
                  label: 'Export',
                },
              ]
            : []),
        ],
        filterControl: false,
      },
      this.config.list,
    );
    return this._tableOptions;
  }

  /** Sets one declared filter; an empty value clears it. Resets to the first page. */
  setFilterValue(name: string, value: string): void {
    this.filterValues = { ...this.filterValues, [name]: value || undefined };
    this.list.setFilter(this.filterValues);
  }

  addUpdateFormOptions(): Partial<FormOptions> {
    return merge(
      { controls: this.addUpdateFormControls() },
      this.config.addUpdate,
    );
  }

  protected startAdd(): void {
    if (isDebugMode()) console.info('%s.add.start', this.name);
    this._addUpdateMode = 'add';
    this.editing = undefined;
    this.conflict.set(false);
    this.addUpdateForm.updateOptions({ header: `Add ${this.name}` });
    this.addUpdateForm.reset();
    this.updateCurrentMode('addupdate');
  }

  /** Reads the selected row fresh (for its `ETag`) and opens it in the form. */
  protected startUpdate(): void {
    const [id] = this.list.selection();
    if (id === undefined) return;
    this.dataSource
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ value, etag }) => {
          if (isDebugMode()) console.info('%s.update.start:', this.name, value);
          this._addUpdateMode = 'update';
          this.editing = { id, etag };
          this.conflict.set(false);
          this.addUpdateForm.updateOptions({ header: `Update ${this.name}` });
          this.addUpdateForm.update(
            this.toAddUpdateFormValue(value) as GenericType,
          );
          this.updateCurrentMode('addupdate');
        },
        error: (err: unknown) => this.handleErrorResponse(err),
      });
  }

  submitAddUpdate(): void {
    if (isDebugMode()) {
      console.info(
        '%s.%s:',
        this.name,
        this._addUpdateMode,
        this.addUpdateForm.rawValue,
      );
    }

    if (!this.validateAddUpdate()) {
      this.addUpdateForm.enable();
      return;
    }

    const payload = this.fromAddUpdateFormValue();
    let request: Observable<unknown>;
    if (this._addUpdateMode === 'add') {
      this.alert.start(`Adding ${this.name} ...`);
      request = this.dataSource.create(payload, {
        idempotencyKey: this.keyFor(payload),
      });
    } else {
      const editing = this.editing;
      if (!editing) return;
      this.alert.start(`Updating ${this.name} ...`);
      request = this.dataSource.update(editing.id, payload, {
        etag: editing.etag,
      });
    }
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.handleAddUpdateSuccess(),
      error: (err: unknown) => this.handleSaveError(err),
    });
  }

  /** One key per submit attempt: reused on retry, renewed once the body changes. */
  private keyFor(payload: $Q): string {
    const body = JSON.stringify(payload);
    if (body !== this.lastCreatePayload) {
      this.idempotencyKey.reset();
      this.lastCreatePayload = body;
    }
    return this.idempotencyKey.get();
  }

  protected validateAddUpdate(): boolean {
    return true;
  }

  protected toRequestParams<T>(rawValue: GenericType): T {
    return Object.entries(rawValue).reduce((result: T, [key, value]) => {
      let resolvedValue: unknown;
      if (!value) {
        resolvedValue = null;
      } else if (typeof value === 'object') {
        resolvedValue = (value as GenericType)['id'];
      } else {
        resolvedValue = value;
      }
      (result as GenericType)[key] = resolvedValue;
      return result;
    }, {} as T);
  }

  protected fromAddUpdateFormValue(): $Q {
    return this.toRequestParams<$Q>(this.addUpdateForm.rawValue);
  }

  protected handleAddUpdateSuccess(): void {
    const added = this._addUpdateMode === 'add';
    this.idempotencyKey.reset();
    this.lastCreatePayload = '';
    this.updateCurrentMode('list');
    this.list.clearSelection();
    this.list.reload();
    this.alert.success(
      added
        ? `Added ${this.name} successfully`
        : `Updated ${this.name} successfully`,
    );
  }

  /**
   * A failed save: 412 raises {@link conflict} (reload and reapply, never a
   * silent overwrite); a problem body lands on the form's controls; anything
   * else is shown as an alert. The form is re-enabled first because enabling
   * re-runs validation and would clear the server errors.
   */
  protected handleSaveError(error: unknown): void {
    this.addUpdateForm.enable();
    switch (crudErrorKind(error)) {
      case 'conflict':
        this.conflict.set(true);
        this.alert.error(
          `This ${this.name} was changed by someone else. Reload the latest version, then save again.`,
        );
        break;
      case 'problem':
        problemToFormErrors(error, this.addUpdateForm.formGroup);
        this.handleErrorResponse(error);
        break;
      default:
        this.handleErrorResponse(error);
    }
  }

  /** Re-reads the row for its new `ETag` and keeps the user's edits to save again. */
  reloadConflict(): void {
    const editing = this.editing;
    if (!editing) return;
    this.dataSource
      .get(editing.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ etag }) => {
          this.editing = { id: editing.id, etag };
          this.conflict.set(false);
          this.alert.info(
            `Reloaded the latest ${this.name}. Your edits are kept, review them and save again.`,
          );
        },
        error: (err: unknown) => this.handleErrorResponse(err),
      });
  }

  cancelAddUpdate(): void {
    this.conflict.set(false);
    this.updateCurrentMode('list');
  }

  deleteModalOptions(): Partial<ModalOptions> {
    return merge(
      {
        keyboard: false,
        backdrop: 'static',
        header: {
          text: `Delete ${this.pluralName}`,
          icon: 'exclamation-triangle-fill',
          classes: 'text-bg-secondary',
        },
        submitBtn: {
          type: 'button',
          class: 'danger',
          label: 'Delete',
          callback: () => this.submitDelete(),
        },
      },
      this.config.delete,
    );
  }

  protected startDelete(): void {
    this.deleteModal.updateOptions({
      context: { name: this.name, count: this.list.selection().length },
    });
    this.deleteModal.open();
  }

  /** One `:batchDelete` when the data source has it, else one `DELETE` per id. */
  submitDelete(): void {
    this.deleteModal.dismissAll('Submit');
    this.alert.start(`Deleting ${this.pluralName} ...`);
    const ids = [...this.list.selection()];
    if (isDebugMode()) console.info('%s.delete:', this.name, ids);
    const { batchDelete } = this.dataSource;
    const request: Observable<unknown> = batchDelete
      ? batchDelete.call(this.dataSource, ids)
      : forkJoin(ids.map((id) => this.dataSource.delete(id))).pipe(
          map(() => undefined),
        );
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.alert.success(
          `Deleted ${ids.length} ${ids.length === 1 ? this.name : this.pluralName} successfully`,
        );
        this.list.clearSelection();
        this.list.reload();
      },
      error: (err: unknown) => this.handleErrorResponse(err),
    });
  }

  protected startImport(): void {
    this.importFile.set(undefined);
    this.importOutcome.set(undefined);
    this.updateCurrentMode('import');
  }

  setImportFile(file: File | undefined): void {
    this.importFile.set(file);
    this.importOutcome.set(undefined);
  }

  /** Step 1: upload with `validateOnly=true`; nothing is saved. */
  validateImport(): void {
    this.runImport(true);
  }

  /** Step 2: upload again to commit, after a successful {@link validateImport}. */
  commitImport(): void {
    this.runImport(false);
  }

  private runImport(validateOnly: boolean): void {
    const file = this.importFile();
    const importFn = this.dataSource.import;
    if (!file || !importFn) return;
    this.alert.hide();
    importFn
      .call(this.dataSource, file, { validateOnly })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => this.handleImportReport(report, validateOnly),
        error: (err: unknown) => this.handleImportError(err),
      });
  }

  private handleImportReport(
    report: ImportReport,
    validateOnly: boolean,
  ): void {
    const errors = (report.errors ?? []).map(
      (e) => `${e.pointer ? `${e.pointer}: ` : ''}${e.detail}`,
    );
    if (validateOnly) {
      this.importOutcome.set({
        report,
        errors,
        canCommit: errors.length === 0,
      });
      return;
    }
    // Committed. A 200 that lists errors is the partial-save variant.
    this.importOutcome.set({ report, errors, canCommit: false });
    const summary = `${this.pluralName} imported [Added ${report.created} | Updated ${report.updated} | Skipped ${report.skipped}]`;
    if (errors.length) {
      this.alert.warning(`${summary}, ${errors.length} row(s) failed`);
    } else {
      // Switch first: changing mode hides the alert.
      this.updateCurrentMode('list');
      this.alert.success(summary);
    }
    this.list.reload();
  }

  /** A 422 lists the failing rows (`pointer = /rows/12/Quantity`); nothing was saved. */
  private handleImportError(error: unknown): void {
    const problem = problemOf(error);
    const errors = (problem?.errors ?? []).map(
      (e) => `${e.pointer ? `${e.pointer}: ` : ''}${e.detail}`,
    );
    if (errors.length) {
      this.importOutcome.set({ errors, canCommit: false });
    } else {
      this.handleErrorResponse(error);
    }
  }

  downloadTemplate(prefill: boolean): void {
    this.dataSource.importTemplate
      ?.call(this.dataSource, this.list.filter(), { prefill })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (file: CrudFileDownload) =>
          AppUtil.saveBlob(file.blob, file.fileName),
        error: (err: unknown) => this.handleErrorResponse(err),
      });
  }

  /** `GET` of the collection with the current filters and `Accept: exportFormat`. */
  submitExport(): void {
    this.dataSource.export
      ?.call(this.dataSource, this.exportFormat, this.list.filter())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (file: CrudFileDownload) =>
          AppUtil.saveBlob(file.blob, file.fileName),
        error: (err: unknown) => this.handleErrorResponse(err),
      });
  }

  cancelImport(): void {
    this.updateCurrentMode('list');
  }
}
