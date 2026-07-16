import { JsonPipe } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import { FormUtil } from '@rn-forge/ng/core';
import {
  DropdownFieldComponent,
  FormComponent,
  FormOptions,
  InputFieldComponent,
  MultiTypeaheadFieldComponent,
  RichTextFieldComponent,
  TypeaheadFieldComponent,
} from '@rn-forge/ng-bootstrap/form';

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'];

const COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'US', name: 'United States' },
];

const TAGS = [
  'Angular',
  'Bootstrap',
  'TypeScript',
  'RxJS',
  'Signals',
  'Forms',
  'HTTP',
  'CRUD',
];

@Component({
  selector: 'app-forms-page',
  standalone: true,
  imports: [
    JsonPipe,
    FormComponent,
    InputFieldComponent,
    DropdownFieldComponent,
    TypeaheadFieldComponent,
    MultiTypeaheadFieldComponent,
    RichTextFieldComponent,
  ],
  templateUrl: './forms.page.html',
})
export class FormsPageComponent {
  @ViewChild('form') private form!: FormComponent;

  protected submitted: unknown;

  protected readonly categories = CATEGORIES;
  protected readonly countries = COUNTRIES;
  protected readonly countryNames = COUNTRIES.map((c) => c.name);
  protected readonly tags = TAGS;

  protected formOptions: Partial<FormOptions> = {
    header: 'All Field Types',
    controls: {
      name: ['', Validators.required],
      price: [null, FormUtil.VALIDATORS.NUMBER({ min: 0 })],
      launchDate: ['', FormUtil.VALIDATORS.DATE()],
      notes: [''],
      category: ['', Validators.required],
      country: [null],
      tags: [[]],
      description: [''],
    },
    submitBtn: 'Submit',
    cancelBtn: 'Reset',
  };

  protected onSubmit(value: unknown): void {
    this.submitted = value;
    this.form.enable();
  }

  protected onCancel(): void {
    this.form.reset();
    this.submitted = undefined;
  }
}
