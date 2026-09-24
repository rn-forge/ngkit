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
import {
  AlertComponent,
  ButtonComponent,
  ConfigurableComponent,
  ModalComponent,
  TableComponent,
} from '@rn-forge/ng-bootstrap';
import { FormComponent } from '@rn-forge/ng-bootstrap/form';
import { AbstractCrudManager } from './crud.manager';
import { ReadModel, WriteModel } from '@rn-forge/ng/crud';
import { CrudContext, CrudOptions } from './crud.types';

export type { CrudOptions } from './crud.types';

@Component({
  selector: 'rnf-crud',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    FormComponent,
    ModalComponent,
    TableComponent,
  ],
  templateUrl: './crud.component.html',
})
export class CrudComponent
  extends ConfigurableComponent<CrudOptions>
  implements AfterViewInit
{
  override configKey = 'crud';

  manager: InputSignal<AbstractCrudManager<WriteModel, ReadModel>> =
    input.required();
  addUpdateFormTemplate: InputSignal<TemplateRef<unknown> | undefined> = input<
    TemplateRef<unknown> | undefined
  >();

  @ViewChild(AlertComponent) private readonly alertComponent!: AlertComponent;
  @ViewChild('listTable') private readonly listTable!: TableComponent;
  @ViewChild('addUpdateForm') private readonly addUpdateForm!: FormComponent;
  @ViewChild('deleteModal') private readonly deleteModal!: ModalComponent;

  override defaultOptions(): Partial<CrudOptions> {
    return {
      list: {},
      addUpdate: {},
      delete: {},
    };
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();
    const context: CrudContext = {
      listTable: this.listTable,
      addUpdateForm: this.addUpdateForm,
      deleteModal: this.deleteModal,
      alert: this.alertComponent,
      config: () => this.config,
    };
    this.manager().init(context);
  }
}
