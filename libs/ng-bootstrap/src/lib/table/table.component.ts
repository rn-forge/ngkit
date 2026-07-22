// external imports
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  Signal,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import $ from 'jquery';

// internal imports
import {
  GenericType,
  HtmlAttributesDirective,
  isDebugMode,
} from '@rn-forge/ng/core';
import { ConfigurableComponent } from '../bootstrap.component';
import { ButtonComponent } from '../button/button.component';
import { TableOptions, ToolbarButton } from './table.types';

/**
 * Feature-rich Bootstrap-Table wrapper with an imperative data API, toolbar button integration,
 * optional tree-grid support, and column visibility / filter controls.
 *
 * Basic usage:
 * ```html
 * <rnf-table #table [options]="tableOptions" />
 * ```
 * ```ts
 * @ViewChild('table') table!: TableComponent;
 *
 * readonly tableOptions: Partial<TableOptions> = {
 *   columns: [
 *     { field: 'id', title: 'ID' },
 *     { field: 'name', title: 'Name', sortable: true },
 *   ],
 *   toolbarButtons: [
 *     ToolbarHelper.addButton(() => this.add()),
 *     ToolbarHelper.updateButton(() => this.update()),
 *     ToolbarHelper.deleteButton(() => this.delete()),
 *   ],
 *   ajax: (params) => this.service.list(params.data).subscribe(params.success),
 * };
 * ```
 *
 * Imperative operations after render:
 * ```ts
 * this.table.load(rows);
 * const row = this.table.getSelectedRow<MyType>();
 * this.table.addRow(newRow);
 * this.table.updateRow(updatedRow);
 * this.table.deleteSelectedRows();
 * ```
 *
 * Configure globally: `provideRnForgeBootstrapConfig({ table: { pageSize: 20 } })`.
 */
@Component({
  selector: 'rnf-table',
  standalone: true,
  imports: [CommonModule, ButtonComponent, HtmlAttributesDirective],
  templateUrl: './table.component.html',
})
export class TableComponent
  extends ConfigurableComponent<TableOptions>
  implements AfterViewInit
{
  @ViewChild('table') private readonly tableElement!: ElementRef<HTMLElement>;

  private readonly _rendered: WritableSignal<boolean> = signal(false);
  private _table!: JQuery<HTMLElement>;
  private idField = 'id';
  private readonly _selectedCount: WritableSignal<number> = signal(0);

  readonly toolbarId: Signal<string> = computed(
    () => `${this.instanceId}-toolbar`,
  );

  override delayedAfterViewInit(): void {
    this._table = $(this.tableElement.nativeElement);
    if (this.config.autoRender !== false) {
      this.render();
    }
  }

  /** ConfigurableComponent overrides **/
  override configKey = 'table';

  override configureOptions(currentOptions: Partial<TableOptions>): void {
    this.idField = currentOptions.idField ?? this.idField;
    currentOptions.uniqueId = currentOptions.idField;
    currentOptions.toolbar = `#${this.instanceId}-toolbar`;

    for (const button of currentOptions.toolbarButtons ?? []) {
      if (button.linkToRow || button.linkToRows) {
        button.disabled = () => this.isButtonDisabled(button);
      }
    }

    if (currentOptions.treeEnable) {
      const treeColumn =
        currentOptions.columns?.findIndex(
          (col) => col.field === currentOptions.treeShowField,
        ) ?? 0;
      const existingOnPostBody = currentOptions.onPostBody as
        ((...args: unknown[]) => void) | undefined;
      currentOptions.onPostBody = (...args: unknown[]) => {
        existingOnPostBody?.(...args);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this._table as any).treegrid({ treeColumn, initialState: 'expanded' });
      };
    }

    if (isDebugMode()) {
      console.debug(
        `TableComponent[${this.instanceId}].configureOptions: idField=${this.idField}, toolbar=${currentOptions.toolbar}, buttons=${currentOptions.toolbarButtons?.length ?? 0}`,
      );
    }
  }

  override defaultOptions(): Partial<TableOptions> {
    return {
      autoRender: true,
      columns: [],
      toolbarButtons: [],

      idField: 'id',
      classes: 'table table-bordered table-hover table-striped',
      clickToSelect: true,
      search: true,

      filterControl: false,
      filterControlVisible: false,
      icons: {},
      showFilterControlSwitch: true,

      mobileResponsive: false,
      minWidth: 576,
      minHeight: undefined,
      heightThreshold: 100,
      checkOnInit: true,
      columnsHidden: [],

      pageSize: 5,
      pageList: [5, 10, 20, 100],
      pagination: true,
      paginationLoop: false,
      showPaginationSwitch: true,

      showColumns: true,
      showColumnsToggleAll: true,
      showFullscreen: true,
      showRefresh: true,
      showToggle: true,
      stickyHeader: true,
    };
  }

  /** Component methods **/
  /** `true` after the first {@link render} call completes. */
  get rendered(): boolean {
    return this._rendered();
  }

  /** Returns the current bootstrap-table options object (live from the plugin). */
  get bootstrapOptions(): TableOptions {
    return this.bootstrapTable('getOptions') as TableOptions;
  }

  /** The underlying jQuery element. Use sparingly — prefer the typed methods. */
  get table(): JQuery<HTMLElement> {
    return this._table;
  }

  /** Low-level proxy to `bootstrapTable(method, param)`. Use typed helpers where possible. */
  bootstrapTable(method: string, param?: unknown) {
    return this.table?.bootstrapTable(method, param);
  }

  /**
   * (Re-)renders the table. Optionally merges `updatedOptions` before rendering.
   * Called automatically on init when `autoRender` is `true` (the default).
   */
  render(updatedOptions?: Partial<TableOptions>) {
    this.updateOptions(updatedOptions);

    if (isDebugMode())
      console.debug(`TableComponent[${this.instanceId}].render:`, this.config);
    this._selectedCount.set(0);
    this.bootstrapTable('destroy').bootstrapTable(this.config);
    this._attachSelectionListeners();
    this._rendered.set(true);
  }

  /** Destroys the bootstrap-table plugin instance and clears the selection count. */
  destroy() {
    this._table?.off('.ng-accel');
    this.bootstrapTable('destroy');
    this._selectedCount.set(0);
    this._rendered.set(false);
  }

  /** Loads (replaces) the table's data with `data`. Hides the loading spinner first. */
  load(data: GenericType[]) {
    if (isDebugMode())
      console.debug(
        `TableComponent[${this.instanceId}].load: rows=${data.length}`,
      );
    this.bootstrapTable('hideLoading')
      .bootstrapTable('resetView')
      .bootstrapTable('load', data);
  }

  /** Triggers a refresh (re-fetches data via `ajax` if configured). */
  refresh() {
    this.bootstrapTable('refresh');
  }

  /** Returns all rows currently loaded in the table. */
  getData<T extends GenericType>(): T[] {
    return this.bootstrapTable('getData') ?? [];
  }

  /** Returns all currently selected rows. */
  getSelectedRows<T extends GenericType>(): T[] {
    return this.bootstrapTable('getSelections') ?? [];
  }

  /** Returns the first selected row. Use when `linkToRow: true` toolbar buttons ensure exactly one selection. */
  getSelectedRow<T extends GenericType>(): T {
    return this.getSelectedRows<T>()[0];
  }

  getSelectedRowsCount(): number {
    return this.getSelectedRows().length;
  }

  unselectAllRows() {
    this.bootstrapTable('uncheckAll');
  }

  /** Appends `row` to the table and clears the current selection. */
  addRow(row: GenericType) {
    if (isDebugMode())
      console.debug(
        `TableComponent[${this.instanceId}].addRow:`,
        row[this.idField],
      );
    this.bootstrapTable('append', row);
    this.unselectAllRows();
  }

  /** Updates the row matching `row[idField]` in place and briefly highlights it. */
  updateRow(row: GenericType) {
    if (isDebugMode())
      console.debug(
        `TableComponent[${this.instanceId}].updateRow:`,
        row[this.idField],
      );
    this.bootstrapTable('updateByUniqueId', {
      id: row[this.idField],
      row: row,
    });

    this.unselectAllRows();
    this.highlightRow(row[this.idField]);
  }

  /** Removes all selected rows from the table and returns their IDs. */
  deleteSelectedRows(): (string | number)[] {
    const ids = this.getSelectedRows<GenericType>().map(
      (row: GenericType) => row[this.idField],
    );
    this.deleteRows(ids);
    return ids as (string | number)[];
  }

  /** Removes the rows with the given IDs, briefly applying an error highlight before removal. */
  deleteRows(ids: unknown[]) {
    ids.forEach((id: unknown) => this.highlightRow(id, true));
    if (isDebugMode()) console.debug('TableComponent.deleteRows:', ids);
    this.bootstrapTable('remove', { field: this.idField, values: ids });
  }

  /** Briefly applies a CSS highlight class to the row with the given `id`. `error=true` uses a red highlight. */
  highlightRow(id: unknown, error = false) {
    const cssClass = error ? 'highlight-error' : 'highlight-update';
    this._table.find(`tr[data-uniqueid=${id}]`).addClass(cssClass);
    window.setTimeout(() => {
      this._table
        .find(`tr[data-uniqueid=${id}]`)
        .removeClass('highlight-update highlight-error');
    }, 5000);
  }

  private _attachSelectionListeners(): void {
    this._table.off('.ng-accel');
    this._table.on(
      'check.bs.table.ng-accel uncheck.bs.table.ng-accel check-all.bs.table.ng-accel uncheck-all.bs.table.ng-accel',
      () => this._selectedCount.set(this.getSelectedRowsCount()),
    );
  }

  private isButtonDisabled(button: ToolbarButton): boolean {
    if (button.linkToRow) return this._selectedCount() !== 1;
    if (button.linkToRows) return this._selectedCount() < 1;
    return false;
  }
}

// re-export for public API
export type { ColumnOptions, TableOptions, ToolbarButton } from './table.types';
export { ToolbarHelper } from './table.types';
