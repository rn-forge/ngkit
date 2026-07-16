// external imports
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { HtmlAttributesDirective } from '@rn-forge/ng/core';

// internal imports
import { FormFieldComponent } from '../form-field/form-field.component';
import { TypeaheadFieldComponent } from '../typeahead-field/typeahead-field.component';

// global variables

// component definition
@Component({
  selector: 'rnf-multi-typeahead-field',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormFieldComponent,
    NgbTypeaheadModule,
    HtmlAttributesDirective,
  ],
  templateUrl: './multi-typeahead-field.component.html',
  styleUrl: './multi-typeahead-field.component.scss',
})
export class MultiTypeaheadFieldComponent extends TypeaheadFieldComponent {
  override configKey = 'multiTypeaheadField';
  protected selectedOptions: unknown[] = [];
  protected filteredOptions: unknown[] = [];
  protected inputValue = '';

  onChange = (_selectedOptions: unknown[]) => {
    return;
  };
  onTouched = (_selectedOptions: unknown[]) => {
    return;
  };

  writeValue(value: unknown[]): void {
    this.selectedOptions = value || [];
  }

  registerOnChange(fn: (_selectedOptions: unknown[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: (_selectedOptions: unknown[]) => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(_isDisabled: boolean): void {
    // Implement if you want to support disabling
  }

  onInputChange(): void {
    const value = this.inputValue.toLowerCase();
    this.filteredOptions = this.filterFn()(value, this);
  }

  addValue(option: unknown): void {
    this.selectedOptions.push(option);
    this.propagateChange();
    this.clearInput();
  }

  removeValue(option: unknown): void {
    const index = this.selectedOptions.indexOf(option);
    if (index >= 0) {
      this.selectedOptions.splice(index, 1);
      this.propagateChange();
    }
  }

  private propagateChange(): void {
    this.onChange(this.selectedOptions);
  }

  private clearInput(): void {
    this.inputValue = '';
    this.filteredOptions = [];
  }
}
