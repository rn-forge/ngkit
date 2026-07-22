// external imports
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  input,
  InputSignal,
  OnInit,
  Signal,
  TemplateRef,
} from '@angular/core';
import {
  AbstractControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';

// internal imports
import {
  ButtonComponent,
  ConfigOptions,
  ConfigurableComponent,
} from '@rn-forge/ng-bootstrap';

@Component({
  selector: 'rnf-form-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
})
export class FormFieldComponent {
  field: InputSignal<ParentFieldComponent> = input.required();
  template: InputSignal<TemplateRef<unknown>> = input.required();

  label: InputSignal<boolean> = input(true);
  icon: InputSignal<string> = input('');

  readonly: Signal<boolean> = computed(() => {
    return ['true', 'readonly'].includes(
      this.field().htmlAttributes()?.['readonly'],
    );
  });

  validationError(): string {
    if (!this.field().formGroup) {
      return '';
    }

    const errors: ValidationErrors | null = this.field().getControl()?.errors;
    if (errors) {
      return errors['error'] || '';
    }

    return '';
  }

  protected clearField(): void {
    const control = this.field().getControl();
    if (control.disabled) {
      return;
    }

    control.setValue(null);
    control.markAsDirty();
  }
}

@Component({
  template: '',
})
export abstract class ParentFieldComponent<
  $O extends ConfigOptions = ConfigOptions,
>
  extends ConfigurableComponent<$O>
  implements OnInit
{
  name: InputSignal<string> = input.required();
  formGroup: InputSignal<FormGroup> = input.required();
  id: InputSignal<string | undefined> = input<string | undefined>(undefined);
  label: InputSignal<string | undefined> = input<string | undefined>(undefined);
  formControlName: InputSignal<string | number | null> = input<
    string | number | null
  >(null);

  get fieldId(): string {
    return this.id() ?? this.name();
  }

  get fieldLabel(): string {
    return (
      this.label() ?? this.name().charAt(0).toUpperCase() + this.name().slice(1)
    );
  }

  get fieldFormControlName(): string | number {
    return this.formControlName() ?? this.name();
  }

  checkValidation() {
    if (!this.formGroup) {
      return '';
    }

    const control = this.getControl();
    return control?.invalid && (control.dirty || control.touched)
      ? 'is-invalid'
      : '';
  }

  getControl(): AbstractControl {
    return this.formGroup().controls[this.fieldFormControlName];
  }
}
