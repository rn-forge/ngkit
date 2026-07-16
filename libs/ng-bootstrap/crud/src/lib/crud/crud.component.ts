// external imports
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  InputSignal,
  TemplateRef,
  ViewChild,
  input,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

// internal imports
import { ReadModel, WriteModel } from '@rn-forge/ng/http/crud';
import { AlertComponent } from '@rn-forge/ng-bootstrap';
import { ConfigurableComponent } from '@rn-forge/ng-bootstrap';
import { ButtonComponent } from '@rn-forge/ng-bootstrap';
import {
  FormComponent,
  InputFieldComponent,
} from '@rn-forge/ng-bootstrap/form';
import { ModalComponent } from '@rn-forge/ng-bootstrap';
import { TableComponent } from '@rn-forge/ng-bootstrap';
import { AbstractCRUDManager } from './crud.manager';
import { CRUDContext, CRUDOptions } from './crud.types';

export type { CRUDOptions } from './crud.types';

@Component({
  selector: 'rnf-crud',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    FormComponent,
    InputFieldComponent,
    ModalComponent,
    TableComponent,
  ],
  templateUrl: './crud.component.html',
  styleUrl: './crud.component.scss',
})
export class CRUDComponent
  extends ConfigurableComponent<CRUDOptions>
  implements AfterViewInit
{
  override configKey = 'crud';

  manager: InputSignal<AbstractCRUDManager<WriteModel, ReadModel>> =
    input.required();
  addUpdateFormTemplate: InputSignal<TemplateRef<unknown> | undefined> = input<
    TemplateRef<unknown> | undefined
  >();
  downloadFormTemplate: InputSignal<TemplateRef<unknown> | undefined> = input<
    TemplateRef<unknown> | undefined
  >();

  @ViewChild(AlertComponent) private alertComponent!: AlertComponent;
  @ViewChild('listTable') private readonly listTable!: TableComponent;
  @ViewChild('addUpdateForm') private readonly addUpdateForm!: FormComponent;
  @ViewChild('deleteModal') private readonly deleteModal!: ModalComponent;
  @ViewChild('uploadForm') private readonly uploadForm!: FormComponent;
  @ViewChild('downloadForm') private readonly downloadForm!: FormComponent;

  override defaultOptions(): Partial<CRUDOptions> {
    return {
      list: {},
      addUpdate: {},
      delete: {},
      upload: {},
      download: {},
    };
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();
    const context: CRUDContext = {
      listTable: this.listTable,
      addUpdateForm: this.addUpdateForm,
      deleteModal: this.deleteModal,
      uploadForm: this.uploadForm,
      downloadForm: this.downloadForm,
      alert: this.alertComponent,
      config: () => this.config,
    };
    this.manager().init(context);
  }
}
