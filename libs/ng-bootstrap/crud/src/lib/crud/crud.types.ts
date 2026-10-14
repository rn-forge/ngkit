import {
  AlertComponent,
  ConfigOptions,
  ModalComponent,
  ModalOptions,
  TableComponent,
  TableOptions,
} from '@rn-forge/ng-bootstrap';
import { FormComponent, FormOptions } from '@rn-forge/ng-bootstrap/form';

export type CrudComponentMode = 'list' | 'addupdate' | 'import';

/**
 * A filter the app declares: a named query parameter the backend accepts.
 * Rendered as a text input, or as a select when `options` is given.
 */
export interface CrudFilterField {
  readonly name: string;
  readonly label: string;
  readonly options?: readonly { code: string; name: string }[];
}

export interface CrudOptions extends ConfigOptions {
  list: Partial<TableOptions>;
  addUpdate: Partial<FormOptions>;
  delete: Partial<ModalOptions>;
}

export interface CrudContext {
  readonly listTable: TableComponent;
  readonly addUpdateForm: FormComponent;
  readonly deleteModal: ModalComponent;
  readonly alert: AlertComponent;
  readonly config: () => CrudOptions;
}
