import { AlertComponent } from '@rn-forge/ng-bootstrap';
import { FormOptions } from '@rn-forge/ng-bootstrap/form';
import { ModalOptions } from '@rn-forge/ng-bootstrap';
import { ConfigOptions } from '@rn-forge/ng-bootstrap';
import { TableOptions } from '@rn-forge/ng-bootstrap';
import { FormComponent } from '@rn-forge/ng-bootstrap/form';
import { ModalComponent } from '@rn-forge/ng-bootstrap';
import { TableComponent } from '@rn-forge/ng-bootstrap';

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
