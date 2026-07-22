// external imports
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  EventEmitter,
  HostListener,
  input,
  InputSignal,
  Output,
  Signal,
  ViewChild,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import {
  NgbTypeahead,
  NgbTypeaheadModule,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap';
import { HtmlAttributesDirective, isDebugMode } from '@rn-forge/ng/core';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  Observable,
  OperatorFunction,
  Subject,
} from 'rxjs';

// internal imports
import {
  FormFieldComponent,
  ParentFieldComponent,
} from '../form-field/form-field.component';

// global variables

// global methods
const DEFAULT_FILTER = (
  input: string,
  component: TypeaheadFieldComponent,
): unknown[] => {
  if (input === '') {
    return component.values();
  }

  return component
    .values()
    .filter((value) =>
      component
        .formatterFn()(value, component)
        .toLowerCase()
        .includes(input.toLowerCase()),
    );
};

const DEFAULT_FORMATTER = (
  value: unknown,
  component: TypeaheadFieldComponent,
): string => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  const attrList = component.formatFields()[component.valueType()] ?? ['name'];
  return attrList
    .map((attr) => {
      const resolved = attr
        .split('.')
        .reduce<unknown>(
          (o, i) => (o as Record<string, unknown> | undefined)?.[i],
          value,
        );
      return resolved == null ? '' : String(resolved);
    })
    .join(' - ');
};

// component definition
@Component({
  selector: 'rnf-typeahead-field',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormFieldComponent,
    NgbTypeaheadModule,
    HtmlAttributesDirective,
  ],
  templateUrl: './typeahead-field.component.html',
  styleUrl: './typeahead-field.component.scss',
})
export class TypeaheadFieldComponent extends ParentFieldComponent {
  override configKey = 'typeaheadField';
  values: InputSignal<unknown[]> = input.required();
  type: InputSignal<string | undefined> = input<string | undefined>();
  itemFilter: InputSignal<
    | ((input: string, component: TypeaheadFieldComponent) => unknown[])
    | undefined
  > = input<
    | ((input: string, component: TypeaheadFieldComponent) => unknown[])
    | undefined
  >();
  itemFormatter: InputSignal<
    ((input: unknown, component: TypeaheadFieldComponent) => string) | undefined
  > = input<
    ((input: unknown, component: TypeaheadFieldComponent) => string) | undefined
  >();
  formatFields: InputSignal<Record<string, string[]>> = input<
    Record<string, string[]>
  >({});

  @Output() selectItem = new EventEmitter();

  @ViewChild(NgbTypeahead) instance!: NgbTypeahead;

  focus$ = new Subject<string>();
  click$ = new Subject<string>();

  valueType: Signal<string> = computed<string>(
    () => this.type() ?? this.name(),
  );
  filterFn: Signal<
    (input: string, component: TypeaheadFieldComponent) => unknown[]
  > = computed(() => this.itemFilter() ?? DEFAULT_FILTER);
  formatterFn: Signal<
    (input: unknown, component: TypeaheadFieldComponent) => string
  > = computed(() => this.itemFormatter() ?? DEFAULT_FORMATTER);

  @HostListener('focusout', ['$event'])
  onFocusOut(_event: FocusEvent): void {
    const inputValue = this.formGroup()?.value[this.name()];
    let clearFlag = !inputValue;

    if (!clearFlag) {
      if (this.valueType() !== 'string') {
        clearFlag = typeof inputValue === 'string';
      } else {
        clearFlag =
          this.values().filter((value) => value === inputValue).length === 0;
      }
    }

    if (clearFlag) {
      if (isDebugMode()) {
        console.debug(
          `TypeaheadFieldComponent[${this.name()}]: clearing partial input: '${inputValue}'`,
        );
      }
      this.formGroup()?.patchValue({ [this.fieldFormControlName]: null });
    }
  }

  typeaheadListener: OperatorFunction<string, readonly unknown[]> = (
    text$: Observable<string>,
  ) => {
    const debouncedText$ = text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
    ); // type event
    const clicksWithClosedPopup$ = this.click$.pipe(
      filter(() => !this.instance.isPopupOpen()),
    ); // click while closed event
    const inputFocus$ = this.focus$; // focus event

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      map((input: string) => this.filterFn()(input, this)),
    );
  };

  formatter(input: unknown): string {
    return this.formatterFn()(input, this);
  }

  onItemSelect(entity: NgbTypeaheadSelectItemEvent<unknown>) {
    if (!entity) {
      return;
    }

    this.formGroup()?.patchValue({ [this.fieldFormControlName]: entity.item });
    this.selectItem.emit(entity.item);
  }
}
