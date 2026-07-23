import {
  AlertComponent,
  ConfigOptions,
  ModalComponent,
  ModalOptions,
  TableComponent,
  TableOptions,
} from '@rn-forge/ng-bootstrap';
import { FormComponent, FormOptions } from '@rn-forge/ng-bootstrap/form';

export type COMPONENT_MODES = 'list' | 'addupdate' | 'upload' | 'download';

export interface CRUDOptions extends ConfigOptions {
  list: Partial<TableOptions>;
  addUpdate: Partial<FormOptions>;
  delete: Partial<ModalOptions>;
  upload: Partial<FormOptions>;
  download: Partial<FormOptions>;
}

export interface CRUDContext {
  readonly listTable: TableComponent;
  readonly addUpdateForm: FormComponent;
  readonly deleteModal: ModalComponent;
  readonly uploadForm: FormComponent;
  readonly downloadForm: FormComponent;
  readonly alert: AlertComponent;
  readonly config: () => CRUDOptions;
}
