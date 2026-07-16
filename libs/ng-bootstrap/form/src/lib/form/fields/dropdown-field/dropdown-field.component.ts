// external imports
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  input,
  InputSignal,
  Output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { GenericType, HtmlAttributesDirective } from '@rn-forge/ng/core';

// internal imports
import {
  FormFieldComponent,
  ParentFieldComponent,
} from '../form-field/form-field.component';

// component definition
@Component({
  selector: 'rnf-dropdown-field',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormFieldComponent,
    HtmlAttributesDirective,
  ],
  templateUrl: './dropdown-field.component.html',
  styleUrl: './dropdown-field.component.scss',
})
export class DropdownFieldComponent extends ParentFieldComponent {
  override configKey = 'dropdownField';
  optionList: InputSignal<unknown[]> = input.required();
  valueField: InputSignal<string> = input('code');
  labelField: InputSignal<string> = input('name');

  @Output() selectItem = new EventEmitter<string>();

  onItemSelect(event: Event) {
    this.selectItem.emit((event.target as HTMLSelectElement).value);
  }

  getOptionValue(option: unknown): string {
    return typeof option === 'string'
      ? option
      : ((option as GenericType)[this.valueField()] as string);
  }

  getOptionLabel(option: unknown): string {
    return typeof option === 'string'
      ? option
      : ((option as GenericType)[this.labelField()] as string);
  }
}
