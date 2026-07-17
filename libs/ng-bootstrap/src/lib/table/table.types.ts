import { BootstrapTableColumn, BootstrapTableOptions } from 'bootstrap-table';
import { ConfigOptions } from '../bootstrap.component';
import { ButtonOptions } from '../button/button.types';

export interface TableOptions extends ConfigOptions, BootstrapTableOptions {
  autoRender?: boolean;
  toolbarButtons?: ToolbarButton[];

  escapeTitle?: boolean;
  regexSearch?: boolean;
  searchable?: boolean;
  paginationLoadMore?: boolean;
  totalPages?: number;
  onTogglePagination?: (state: boolean) => void;
  onVirtualScroll?: (startIndex: number, endIndex: number) => void;

  columns?: ColumnOptions[];

  formatNoMatches?: () => string;

  stickyHeader?: boolean;

  filterControl?: boolean;
  filterControlVisible?: boolean;
  filterControlMultipleSearch?: boolean;
  filterControlMultipleSearchDelimiter?: string;
  showFilterControlSwitch?: boolean;

  mobileResponsive?: boolean;
  minWidth?: number;
  minHeight?: number;
  heightThreshold?: number;
  checkOnInit?: boolean;
  columnsHidden?: string[];

  showExport?: boolean;
  exportDataType?: 'basic' | 'all' | 'selected';
  exportOptions?: {
    fileName: string;
  };
  exportTypes?: string[];

  treegrid?: boolean;
  treeEnable?: boolean;
  treeShowField?: string;
  parentIdField?: string;
  rootParentId?: string;
}

export interface ColumnOptions extends BootstrapTableColumn {
  alignStyle?: string;
  filterControl?: 'input' | 'select' | 'datepicker';
}

export interface ToolbarButton extends ButtonOptions {
  linkToRow?: boolean;
  linkToRows?: boolean;
}

/**
 * Factory helpers for the standard CRUD toolbar buttons.
 * Each method returns a pre-configured `ToolbarButton` with icon, colour, and label.
 *
 * - `addButton` — green "+" button, always enabled
 * - `updateButton` — grey "↺" button, enabled only when exactly one row is selected (`linkToRow: true`)
 * - `deleteButton` — red "🗑" button, enabled when one or more rows are selected (`linkToRows: true`)
 * - `uploadButton` — yellow upload button, always enabled
 * - `downloadButton` — green download button, always enabled
 *
 * @example
 * ```ts
 * toolbarButtons: [
 *   ToolbarHelper.addButton(() => this.onAdd()),
 *   ToolbarHelper.updateButton(() => this.onUpdate()),
 *   ToolbarHelper.deleteButton(() => this.onDelete()),
 * ]
 * ```
 */
export class ToolbarHelper {
  static addButton(callback: () => void): ToolbarButton {
    return {
      type: 'button',
      class: 'primary',
      label: 'Add',
      icon: 'plus-lg',
      callback,
    };
  }

  static updateButton(callback: () => void): ToolbarButton {
    return {
      type: 'button',
      class: 'secondary',
      label: 'Update',
      icon: 'arrow-clockwise',
      callback,
      linkToRow: true,
    };
  }

  static deleteButton(callback: () => void): ToolbarButton {
    return {
      type: 'button',
      class: 'danger',
      label: 'Delete',
      icon: 'trash3',
      callback,
      linkToRows: true,
    };
  }

  static uploadButton(callback: () => void): ToolbarButton {
    return {
      type: 'button',
      class: 'warning',
      label: 'Upload',
      icon: 'upload',
      callback,
    };
  }

  static downloadButton(callback: () => void): ToolbarButton {
    return {
      type: 'button',
      class: 'success',
      label: 'Download',
      icon: 'download',
      callback,
    };
  }
}
