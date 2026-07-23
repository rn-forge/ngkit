// external imports
import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Validators } from '@angular/forms';
import { RNF_PERMISSION } from '@rn-forge/ng/auth';
import { BootstrapAjaxParams } from 'bootstrap-table';
import { merge } from 'lodash-es';

// internal imports
import { GenericType, isDebugMode } from '@rn-forge/ng/core';
import { DownloadResponse, HttpUtil } from '@rn-forge/ng/http';
import {
  BackendService,
  BulkDeleteResponse,
  ListResponse,
  ReadModel,
  UploadResponse,
  WriteModel,
} from '@rn-forge/ng/http/crud';
import { FormOptions } from '@rn-forge/ng-bootstrap/form';
import {
  ColumnOptions,
  ModalOptions,
  TableOptions,
  ToolbarHelper,
} from '@rn-forge/ng-bootstrap';
import { COMPONENT_MODES, CRUDContext, CRUDOptions } from './crud.types';

/**
 * Abstract base class that wires a `BackendService` to a `CRUDComponent`, implementing
 * the full list / add / update / delete / upload / download lifecycle.
 *
 * Extend this class per domain resource, provide it in your feature module/component, and
 * inject it into `<rnf-crud [manager]="manager" />`:
 *
 * ```ts
 * @Injectable()
 * export class ProductsManager extends AbstractCRUDManager<ProductWrite, ProductRead> {
 *   readonly name = 'Product';
 *   permissionKey = 'products';
 *
 *   constructor(readonly domainService: ProductsService) { super(); }
 *
 *   tableColumns(): ColumnOptions[] {
 *     return [
 *       { field: 'id', title: 'ID' },
 *       { field: 'name', title: 'Name', sortable: true },
 *     ];
 *   }
 *
 *   addUpdateFormControls() {
 *     return { name: ['', Validators.required] };
 *   }
 *
 *   toAddUpdateFormValue(data: ProductRead): ProductWrite {
 *     return { id: data.id, name: data.name };
 *   }
 * }
 * ```
 *
 * Permission checks use `RNF_PERMISSION` with keys `<permissionKey>.list`, `.create`,
 * `.update`, `.delete`, `.upload`, `.download`. Return `true` from the check to enable
 * the corresponding toolbar button and/or view.
 *
 * @template $Q Write model (request payload), extends {@link WriteModel}.
 * @template $S Read model (response payload), extends {@link ReadModel}.
 */
@Injectable()
export abstract class AbstractCRUDManager<
  $Q extends WriteModel,
  $S extends ReadModel,
> {
  private readonly permissionService = inject(RNF_PERMISSION);
  private readonly destroyRef = inject(DestroyRef);

  private ctx: CRUDContext | undefined;
  private _addUpdateMode: 'add' | 'update' = 'add';
  private _tableOptions: Partial<TableOptions> | undefined;
  private _tableRows: $S[] = [];

  readonly currentMode = signal<COMPONENT_MODES>('list');

  /** Display name for the resource (e.g. `'Product'`). Used in alert messages and form headers. */
  abstract readonly name: string;
  /** Dot-notation permission key prefix (e.g. `'products'` → checks `products.list`, `products.create`, etc.). Set to `''` to bypass all permission checks. */
  abstract permissionKey: string;

  /** The `BackendService` instance for this resource. */
  abstract get domainService(): BackendService<$Q, $S>;
  /** Returns the `ColumnOptions[]` for the list table. */
  abstract tableColumns(): ColumnOptions[];
  /** Returns the reactive-form controls map for the add/update form. */
  abstract addUpdateFormControls(): GenericType;
  /** Converts a read-model row into the write-model shape for pre-filling the update form. */
  abstract toAddUpdateFormValue(data: $S): $Q;

  get pluralName(): string {
    return `${this.name}s`;
  }

  protected uploadFieldName = 'uploadFile';

  init(ctx: CRUDContext): void {
    this.ctx = ctx;
  }

  private requireCtx(): CRUDContext {
    if (!this.ctx) {
      throw new Error(
        'AbstractCRUDManager.init() must be called before any operation',
      );
    }
    return this.ctx;
  }

  protected get listTable() {
    return this.requireCtx().listTable;
  }
  protected get addUpdateForm() {
    return this.requireCtx().addUpdateForm;
  }
  protected get deleteModal() {
    return this.requireCtx().deleteModal;
  }
  protected get uploadForm() {
    return this.requireCtx().uploadForm;
  }
  protected get downloadForm() {
    return this.requireCtx().downloadForm;
  }
  protected get alert() {
    return this.requireCtx().alert;
  }
  protected get config(): CRUDOptions {
    return (this.ctx?.config() ?? {
      list: {},
      addUpdate: {},
      delete: {},
      upload: {},
      download: {},
    }) as CRUDOptions;
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
  enableUpload(): boolean {
    return this.checkPermission('upload');
  }
  enableDownload(): boolean {
    return this.checkPermission('download');
  }

  handleErrorResponse(response: HttpErrorResponse, message?: string): void {
    this.alert.error(HttpUtil.formatError(response, message));
  }

  protected updateCurrentMode(mode: COMPONENT_MODES): void {
    if (isDebugMode()) console.debug(`${this.name}.mode:`, mode);
    this.currentMode.set(mode);
    this.ctx?.alert.hide();
  }

  tableOptions(): Partial<TableOptions> {
    if (this._tableOptions) return this._tableOptions;
    this._tableOptions = merge(
      {
        columns: this.tableColumns(),
        ajax: (params: BootstrapAjaxParams) => this.tableDataSource(params),
        showExport: false,
        mobileResponsive: false,
        pageSize: 10,
        paginationLoadMore: true,
        queryParams: (params: GenericType) => {
          params['limit'] = 2000;
          params['offset'] = this._tableRows.length;
          this.adjustTableQueryParams(params);
          return params;
        },
        responseHandler: (response: ListResponse<$S>) => {
          this._tableRows = this.handleListResponse(this._tableRows, response);
          return this._tableRows;
        },
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
          ...(this.enableUpload()
            ? [ToolbarHelper.uploadButton(() => this.startUpload())]
            : []),
          ...(this.enableDownload()
            ? [ToolbarHelper.downloadButton(() => this.startDownload())]
            : []),
        ],
        filterControl: false,
        exportOptions: { fileName: this.pluralName },
      },
      this.config.list,
    );
    return this._tableOptions;
  }

  protected adjustTableQueryParams(_params: GenericType): void {
    return;
  }

  protected handleListResponse(rows: $S[], response: ListResponse<$S>): $S[] {
    return rows.concat(response.results);
  }

  protected tableDataSource(params: BootstrapAjaxParams): void {
    this.domainService
      .list(params.data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ListResponse<$S>) => {
          if (isDebugMode())
            console.debug(
              'AbstractCRUDManager.tableDataSource:',
              response.count,
            );
          params.success(response);
        },
        error: (err: HttpErrorResponse) => {
          params.error({ status: err.status } as JQueryXHR);
          this.ctx?.alert.error(HttpUtil.formatError(err));
        },
      });
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
    this.addUpdateForm.updateOptions({ header: `Add ${this.name}` });
    this.addUpdateForm.reset();
    this.updateCurrentMode('addupdate');
  }

  protected startUpdate(): void {
    const data = this.listTable.getSelectedRow<$S>();
    if (isDebugMode()) console.info('%s.update.start:', this.name, data);
    this._addUpdateMode = 'update';
    this.addUpdateForm.updateOptions({ header: `Update ${this.name}` });
    this.addUpdateForm.update(this.toAddUpdateFormValue(data) as GenericType);
    this.updateCurrentMode('addupdate');
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

    const writeObject = this.fromAddUpdateFormValue();

    if (this._addUpdateMode === 'add') {
      this.alert.start(`Adding ${this.name} ...`);
      this.domainService
        .create(writeObject)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response: $S) => this.handleAddUpdateResponse(response),
          error: (err: HttpErrorResponse) => {
            this.handleErrorResponse(err);
            this.addUpdateForm.enable();
          },
        });
    } else {
      this.alert.start(`Updating ${this.name} ...`);
      this.domainService
        .update(writeObject['id'] ?? -1, writeObject)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response: $S) => this.handleAddUpdateResponse(response),
          error: (err: HttpErrorResponse) => {
            this.handleErrorResponse(err);
            this.addUpdateForm.enable();
          },
        });
    }
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

  protected handleAddUpdateResponse(response: $S): void {
    if (isDebugMode())
      console.info('%s.%s.response:', this.name, this._addUpdateMode, response);
    this.updateCurrentMode('list');
    if (this._addUpdateMode === 'add') {
      this.listTable.addRow(
        this.adjustAddUpdateResponse(response) as GenericType,
      );
      this.alert.success(`Added ${this.name} successfully`);
    } else {
      this.listTable.updateRow(
        this.adjustAddUpdateResponse(response) as GenericType,
      );
      this.alert.success(`Updated ${this.name} successfully`);
    }
  }

  protected adjustAddUpdateResponse(response: $S): $S {
    return response;
  }

  cancelAddUpdate(): void {
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
      context: {
        name: this.name,
        count: this.listTable.getSelectedRowsCount(),
      },
    });
    this.deleteModal.open();
  }

  submitDelete(): void {
    this.deleteModal.dismissAll('Submit');
    this.alert.start(`Deleting ${this.pluralName} ...`);
    const ids = this.listTable.getSelectedRows<$S>().map((row: $S) => row.id);
    if (isDebugMode()) console.info('%s.delete:', this.name, ids);
    this.domainService
      .bulkDelete(ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: BulkDeleteResponse) => {
          this.alert.success(response.message);
          this.listTable.deleteRows(ids);
        },
        error: (err: HttpErrorResponse) => this.handleErrorResponse(err),
      });
  }

  downloadTemplate(includeData: boolean): void {
    this.domainService
      .uploadTemplate({ prefill: includeData })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: DownloadResponse) => HttpUtil.downloadFile(response),
        error: (err: HttpErrorResponse) => this.handleErrorResponse(err),
      });
  }

  uploadFormOptions(): Partial<FormOptions> {
    return merge(
      {
        controls: { uploadFile: ['', [Validators.required]] },
        header: `Upload ${this.pluralName}`,
        submitBtn: 'Upload',
      },
      this.config.upload,
    );
  }

  protected startUpload(): void {
    this.updateCurrentMode('upload');
    this.uploadForm.reset();
  }

  submitUpload(): void {
    if (isDebugMode())
      console.info('%s.upload: field=%s', this.name, this.uploadFieldName);
    this.alert.start(`Uploading ${this.pluralName} ...`);
    this.updateCurrentMode('list');
    this.domainService
      .upload(this.uploadFieldName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: UploadResponse) => {
          if (response.errors.length > 0) {
            this.alert.error(
              `${this.pluralName} uploaded with errors [Added ${response.created} | Updated: ${response.updated} | Errored: ${response.errors.length}]`,
            );
          } else {
            this.alert.success(
              `${this.pluralName} uploaded successfully [Added ${response.created} | Updated: ${response.updated}]`,
            );
          }
          this.listTable.refresh();
        },
        error: (err: HttpErrorResponse) => this.handleErrorResponse(err),
      });
  }

  cancelUpload(): void {
    this.updateCurrentMode('list');
  }

  protected downloadFormControls(): GenericType {
    return {};
  }

  downloadFormOptions(): Partial<FormOptions> {
    return merge(
      {
        controls: this.downloadFormControls(),
        header: `Download ${this.pluralName}`,
      },
      this.config.download,
    );
  }

  protected startDownload(): void {
    this.updateCurrentMode('download');
    this.downloadForm.reset();
  }

  submitDownload(): void {
    const params = this.toRequestParams<$Q>(this.downloadForm.rawValue);
    if (isDebugMode()) console.info('%s.download:', this.name, params);
    this.domainService
      .download(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: DownloadResponse) => {
          this.updateCurrentMode('list');
          HttpUtil.downloadFile(response);
        },
        error: (err: HttpErrorResponse) => {
          this.updateCurrentMode('list');
          this.handleErrorResponse(err);
        },
      });
  }

  cancelDownload(): void {
    this.updateCurrentMode('list');
  }
}
