// external imports
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  HostListener,
  signal,
} from '@angular/core';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { HtmlAttributesDirective } from '@rn-forge/ng/core';
import { merge } from 'rxjs';

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
    FormFieldComponent,
    NgbTypeaheadModule,
    HtmlAttributesDirective,
  ],
  templateUrl: './multi-typeahead-field.component.html',
  styleUrl: './multi-typeahead-field.component.scss',
})
export class MultiTypeaheadFieldComponent extends TypeaheadFieldComponent {
  override configKey = 'multiTypeaheadField';
  protected filteredOptions = signal<unknown[]>([]);
  protected inputText = signal('');

  private readonly control = computed(() => this.getControl());
  private readonly version = signal(0);
  // read-through of the parent control; not a second copy
  private readonly controlState = computed(() => {
    this.version();
    const control = this.control();
    return { value: control.value, disabled: control.disabled };
  });

  constructor() {
    super();
    effect((onCleanup) => {
      const control = this.control();
      const subscription = merge(
        control.valueChanges,
        control.statusChanges,
      ).subscribe(() => {
        this.clearInput();
        this.version.update((v) => v + 1);
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected readonly chips = computed<unknown[]>(() => {
    const value = this.controlState().value;
    return Array.isArray(value) ? value : [];
  });
  protected readonly isDisabled = computed(() => this.controlState().disabled);

  @HostListener('focusout', ['$event'])
  override onFocusOut(_event: FocusEvent): void {
    // the inherited partial-input clearing is for a single scalar value
    return;
  }

  onInputChange(event: Event): void {
    if (this.control().disabled) {
      return;
    }
    const text = (event.target as HTMLInputElement).value;
    this.inputText.set(text);
    this.filteredOptions.set(this.filterFn()(text, this));
  }

  addValue(option: unknown): void {
    const control = this.control();
    if (control.disabled) {
      return;
    }
    control.setValue([...this.chipsOf(control.value), option]);
    control.markAsDirty();
  }

  removeValue(option: unknown): void {
    const control = this.control();
    if (control.disabled) {
      return;
    }
    const chips = [...this.chipsOf(control.value)];
    const index = chips.indexOf(option);
    if (index >= 0) {
      chips.splice(index, 1);
      control.setValue(chips);
      control.markAsDirty();
    }
  }

  protected onBlur(): void {
    this.control().markAsTouched();
  }

  private chipsOf(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private clearInput(): void {
    this.inputText.set('');
    this.filteredOptions.set([]);
  }
}
