// external imports
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  InputSignal,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
  effect,
  inject,
  input,
  signal,
  WritableSignal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import {
  FormUtil,
  GenericType,
  HtmlAttributesDirective,
  TemplateContext,
  isDebugMode,
} from '@rn-forge/ng/core';

// internal imports
import {
  ButtonComponent,
  ConfigOptions,
  ConfigurableComponent,
} from '@rn-forge/ng-bootstrap';

// global variables
const _VERTICAL_FORM_CLASSES =
  'col-12 col-md-6 col-lg-8 col-xl-6 col-xxl-4 mx-auto';
const _INLINE_FORM_CLASSES =
  'row row-cols-1 row-cols-md-3 row-cols-lg-5 row-cols-xl-6 gap-3 justify-content-center align-items-center';

@Component({
  selector: 'rnf-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    HtmlAttributesDirective,
  ],
  templateUrl: './form.component.html',
})
export class FormComponent
  extends ConfigurableComponent<FormOptions>
  implements OnInit
{
  private readonly formBuilder: FormBuilder = inject(FormBuilder);

  /** Input properties **/
  template: InputSignal<TemplateRef<unknown> | undefined> = input<
    TemplateRef<unknown> | undefined
  >();

  /** Output events */
  @Output() private readonly formSubmit = new EventEmitter();
  @Output() private readonly formCancel = new EventEmitter();
  @Output() private readonly formReset = new EventEmitter();

  @ViewChild('form') private readonly _formElement!: ElementRef<HTMLElement>;

  private _formGroup!: FormGroup;
  private _context!: TemplateContext;
  private _updateFlag = false;
  private _lastControlKeys: string | undefined;

  protected visible: WritableSignal<boolean> = signal(true);

  /** Lifecycle methods **/
  constructor() {
    super();

    effect(() => {
      const controls = this.config.controls;
      const controlKeys = Object.keys(controls ?? {})
        .sort((a, b) => a.localeCompare(b))
        .join(',');
      if (controlKeys === this._lastControlKeys) {
        return;
      }
      this._lastControlKeys = controlKeys;
      if (isDebugMode())
        console.debug('FormComponent.rebuildGroup: fields=', controlKeys);

      this._formGroup = this.formBuilder.group(controls);
      if (this.config.validators?.validateDateRange) {
        FormUtil.VALIDATORS.DATE_RANGE(
          this._formGroup,
          ...this.config.validators.validateDateRange,
        );
      }
      this._context = {
        $implicit: { formGroup: this._formGroup, ...this.config.contextParams },
      };
    });
  }

  /* ConfigurableComponent overrides */
  override configKey = 'form';

  override configureOptions(currentOptions: Partial<FormOptions>): void {
    currentOptions.classes ??=
      currentOptions.layout === 'inline'
        ? _INLINE_FORM_CLASSES
        : _VERTICAL_FORM_CLASSES;
  }

  override defaultOptions(): Partial<FormOptions> {
    return {
      controls: {},
      layout: 'vertical',
      submitBtn: 'Submit',
      cancelBtn: 'Cancel',
      resetBtn: false,
      contextParams: {},
    };
  }

  /** Component methods **/
  get formGroup(): FormGroup {
    return this._formGroup;
  }

  get context(): TemplateContext {
    return this._context;
  }

  get formElement(): ElementRef<HTMLElement> {
    return this._formElement;
  }

  show(): void {
    this.visible.set(true);
  }

  hide(): void {
    this.visible.set(false);
  }

  reset(resetValue?: GenericType) {
    if (isDebugMode()) console.debug('FormComponent.reset:', resetValue);
    this._updateFlag = false;
    this.enable();
    this._formGroup.reset(resetValue);
  }

  update(formData: GenericType) {
    if (isDebugMode()) console.debug('FormComponent.update:', formData);
    this._updateFlag = true;
    this.enable();
    this._formGroup.reset(formData);
  }

  enable() {
    this._formGroup.enable();
    this.config.disabledFields?.forEach((field) => {
      this._formGroup.get(field)?.disable();
    });
  }

  disable() {
    this._formGroup.disable();
  }

  get rawValue(): GenericType {
    return this._formGroup.getRawValue();
  }

  get controls() {
    return this._formGroup.controls;
  }

  get disabled(): boolean {
    return this._formGroup.disabled;
  }

  get enabled(): boolean {
    return this._formGroup.enabled;
  }

  get errors(): ValidationErrors | null {
    return this._formGroup.errors;
  }

  get status(): string {
    return this._formGroup.status;
  }

  get valid(): boolean {
    return this._formGroup.valid;
  }

  get value(): GenericType {
    return this._formGroup.value;
  }

  protected isSubmitAllowed(): boolean {
    return this._updateFlag
      ? this._formGroup.valid && this._formGroup.dirty
      : this._formGroup.valid;
  }

  protected handleSubmit() {
    if (isDebugMode()) console.info('FormComponent.submit:', this.rawValue);
    this.disable();
    this.formSubmit.emit(this.rawValue);
    return false;
  }

  protected handleCancel() {
    this.enable();
    this.formCancel.emit();
    return false;
  }

  protected handleReset() {
    this.enable();
    this.reset();
    this.formReset.emit();
    return false;
  }

  protected getStatus(): string {
    if (!isDebugMode()) return '';

    const controlErrors = Object.keys(this.controls).map(
      (name: string) =>
        `${name}: ${JSON.stringify(this._formGroup.controls[name].errors)}`,
    );

    return [
      '<ul>',
      `<li><b>Flags:</b>Valid: ${this._formGroup.valid} | Touched: ${this._formGroup.touched} | Dirty: ${this._formGroup.dirty} | Status: ${this._formGroup.status}</li>`,
      `<li><b>Errors:</b> ${controlErrors.join(' | ')}</li>`,
      `<li><b>Value:</b> ${JSON.stringify(this.rawValue)}</li>`,
      '</ul>',
    ].join('');
  }
}

export interface FormOptions extends ConfigOptions {
  controls: GenericType;
  contextParams?: GenericType;
  validators?: {
    validateDateRange?: string[];
  };
  disabledFields?: string[];
  layout?: 'vertical' | 'inline';
  header?: string;
  classes?: string;
  submitBtn?: string | false;
  cancelBtn?: string | false;
  resetBtn?: boolean;
}
