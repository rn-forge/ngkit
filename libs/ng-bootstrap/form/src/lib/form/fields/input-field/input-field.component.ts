// external imports
import { CommonModule } from '@angular/common';
import {
  Component,
  input,
  InputSignal,
  OnInit,
  Signal,
  signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

// internal imports
import { DateUtil, HtmlAttributesDirective } from '@rn-forge/ng/core';
import {
  FormFieldComponent,
  ParentFieldComponent,
} from '../form-field/form-field.component';

type InputType = 'text' | 'textarea' | 'number' | 'date' | 'file';

@Component({
  selector: 'rnf-input-field',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HtmlAttributesDirective,
    FormFieldComponent,
  ],
  templateUrl: './input-field.component.html',
  styleUrl: './input-field.component.scss',
})
export class InputFieldComponent
  extends ParentFieldComponent
  implements OnInit
{
  override configKey = 'inputField';
  type: InputSignal<InputType> = input<InputType>('text');
  icon: InputSignal<string> = input('');

  private readonly _attrs = signal<Record<string, string>>({});
  readonly resolvedAttributes: Signal<Record<string, string>> = this._attrs;

  override ngOnInit(): void {
    super.ngOnInit();

    const attrs = { ...this.htmlAttributes() };

    if (this.type() === 'number') {
      attrs['min'] ??= '0.01';
      attrs['step'] ??= '0.01';
    } else if (this.type() === 'date') {
      if (attrs['min'] && !attrs['min'].match(/^\d{4}-\d{2}-\d{2}$/)) {
        attrs['min'] = DateUtil.diffDate(attrs['min']);
      }
      if (attrs['max'] && !attrs['max'].match(/^\d{4}-\d{2}-\d{2}$/)) {
        attrs['max'] = DateUtil.diffDate(attrs['max']);
      }
    } else if (this.type() === 'file') {
      attrs['accept'] ??= '*/*';
    }

    this._attrs.set(attrs);
  }
}
