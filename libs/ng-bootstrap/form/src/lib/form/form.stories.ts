import { Component, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import { type Meta, type StoryObj } from '@storybook/angular';
import { FormUtil } from '@rn-forge/ng/core';
import { FormComponent, FormOptions } from './form.component';
import { InputFieldComponent } from './fields/input-field/input-field.component';
import { DropdownFieldComponent } from './fields/dropdown-field/dropdown-field.component';
import { TypeaheadFieldComponent } from './fields/typeahead-field/typeahead-field.component';
import { MultiTypeaheadFieldComponent } from './fields/multi-typeahead-field/multi-typeahead-field.component';
import { RichTextFieldComponent } from './fields/rich-text-field/rich-text-field.component';

// ── Shared sample data ────────────────────────────────────────────────────────

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

// ── Basic form (text, number, date, file inputs) ──────────────────────────────

@Component({
  selector: 'rnf-form-basic-demo',
  standalone: true,
  imports: [FormComponent, InputFieldComponent],
  template: `
    <rnf-form
      #form
      [options]="formOptions"
      [template]="fields"
      (formSubmit)="onSubmit($event)"
      (formCancel)="onCancel()" />

    <ng-template #fields let-ctx>
      <rnf-input-field
        name="name"
        label="Full Name"
        [formGroup]="ctx.formGroup" />
      <rnf-input-field
        name="email"
        label="Email"
        [formGroup]="ctx.formGroup"
        [htmlAttributes]="{ type: 'email' }" />
      <rnf-input-field
        name="age"
        label="Age"
        [formGroup]="ctx.formGroup"
        type="number" />
      <rnf-input-field
        name="dob"
        label="Birth Date"
        [formGroup]="ctx.formGroup"
        type="date" />
      <rnf-input-field
        name="bio"
        label="Bio"
        [formGroup]="ctx.formGroup"
        [htmlAttributes]="{ type: 'textarea' }" />
    </ng-template>

    @if (submitted) {
      <pre class="mt-3 p-2 bg-light rounded small">{{ submitted | json }}</pre>
    }
  `,
})
class FormBasicDemo {
  @ViewChild('form') form!: FormComponent;
  submitted: unknown;

  formOptions: Partial<FormOptions> = {
    header: 'User Profile',
    controls: {
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      age: [null, FormUtil.VALIDATORS.NUMBER({ min: 0, max: 150 })],
      dob: ['', FormUtil.VALIDATORS.DATE({ allowPast: true })],
      bio: [''],
    },
    submitBtn: 'Save',
    cancelBtn: 'Reset',
  };

  onSubmit(value: unknown) {
    this.submitted = value;
    this.form.enable();
  }

  onCancel() {
    this.form.reset();
    this.submitted = undefined;
  }
}

// ── Dropdown fields ───────────────────────────────────────────────────────────

@Component({
  selector: 'rnf-form-dropdown-demo',
  standalone: true,
  imports: [FormComponent, InputFieldComponent, DropdownFieldComponent],
  template: `
    <rnf-form
      #form
      [options]="formOptions"
      [template]="fields"
      (formSubmit)="onSubmit($event)" />

    <ng-template #fields let-ctx>
      <rnf-input-field
        name="productName"
        label="Product Name"
        [formGroup]="ctx.formGroup" />

      <!-- String option list -->
      <rnf-dropdown-field
        name="category"
        label="Category"
        [optionList]="categories"
        [formGroup]="ctx.formGroup" />

      <!-- Object option list with custom value/label fields -->
      <rnf-dropdown-field
        name="countryCode"
        label="Country"
        [optionList]="countries"
        valueField="code"
        labelField="name"
        [formGroup]="ctx.formGroup" />
    </ng-template>

    @if (submitted) {
      <pre class="mt-3 p-2 bg-light rounded small">{{ submitted | json }}</pre>
    }
  `,
})
class FormDropdownDemo {
  @ViewChild('form') form!: FormComponent;
  submitted: unknown;

  categories = CATEGORIES;
  countries = COUNTRIES;

  formOptions: Partial<FormOptions> = {
    header: 'Product Details',
    controls: {
      productName: ['', Validators.required],
      category: ['', Validators.required],
      countryCode: ['', Validators.required],
    },
    submitBtn: 'Save',
  };

  onSubmit(value: unknown) {
    this.submitted = value;
    this.form.enable();
  }
}

// ── Typeahead field ───────────────────────────────────────────────────────────

@Component({
  selector: 'rnf-form-typeahead-demo',
  standalone: true,
  imports: [FormComponent, TypeaheadFieldComponent],
  template: `
    <rnf-form
      #form
      [options]="formOptions"
      [template]="fields"
      (formSubmit)="onSubmit($event)" />

    <ng-template #fields let-ctx>
      <!-- String typeahead — type a country name or click to see all -->
      <rnf-typeahead-field
        name="country"
        label="Country (string list)"
        [values]="countryNames"
        [formGroup]="ctx.formGroup" />

      <!-- Object typeahead — searches the 'name' field, stores the full object -->
      <rnf-typeahead-field
        name="countryObj"
        label="Country (object list)"
        [values]="countries"
        type="country"
        [formatFields]="{ country: ['name'] }"
        [formGroup]="ctx.formGroup" />
    </ng-template>

    @if (submitted) {
      <pre class="mt-3 p-2 bg-light rounded small">{{ submitted | json }}</pre>
    }
  `,
})
class FormTypeaheadDemo {
  @ViewChild('form') form!: FormComponent;
  submitted: unknown;

  countryNames = COUNTRIES.map((c) => c.name);
  countries = COUNTRIES;

  formOptions: Partial<FormOptions> = {
    header: 'Typeahead Fields',
    controls: {
      country: [null],
      countryObj: [null],
    },
    submitBtn: 'Submit',
  };

  onSubmit(value: unknown) {
    this.submitted = value;
    this.form.enable();
  }
}

// ── Multi-typeahead field ─────────────────────────────────────────────────────

@Component({
  selector: 'rnf-form-multi-typeahead-demo',
  standalone: true,
  imports: [FormComponent, MultiTypeaheadFieldComponent],
  template: `
    <rnf-form
      #form
      [options]="formOptions"
      [template]="fields"
      (formSubmit)="onSubmit($event)" />

    <ng-template #fields let-ctx>
      <!-- String multi-typeahead — type to filter, select multiple values -->
      <rnf-multi-typeahead-field
        name="tags"
        label="Tags (select multiple)"
        [values]="tags"
        [formGroup]="ctx.formGroup" />
    </ng-template>

    @if (submitted) {
      <pre class="mt-3 p-2 bg-light rounded small">{{ submitted | json }}</pre>
    }
  `,
})
class FormMultiTypeaheadDemo {
  @ViewChild('form') form!: FormComponent;
  submitted: unknown;

  tags = TAGS;

  formOptions: Partial<FormOptions> = {
    header: 'Multi-select Typeahead',
    controls: {
      tags: [[]],
    },
    submitBtn: 'Submit',
  };

  onSubmit(value: unknown) {
    this.submitted = value;
    this.form.enable();
  }
}

// ── Rich-text field ───────────────────────────────────────────────────────────

@Component({
  selector: 'rnf-form-rich-text-demo',
  standalone: true,
  imports: [FormComponent, RichTextFieldComponent],
  template: `
    <rnf-form
      #form
      [options]="formOptions"
      [template]="fields"
      (formSubmit)="onSubmit($event)" />

    <ng-template #fields let-ctx>
      <rnf-rich-text-field
        name="body"
        label="Article Body"
        [styles]="{ height: '200px' }"
        [formGroup]="ctx.formGroup" />
    </ng-template>

    @if (submitted) {
      <pre class="mt-3 p-2 bg-light rounded small">{{ submitted | json }}</pre>
    }
  `,
})
class FormRichTextDemo {
  @ViewChild('form') form!: FormComponent;
  submitted: unknown;

  formOptions: Partial<FormOptions> = {
    header: 'Rich Text Editor',
    controls: {
      body: ['', Validators.required],
    },
    submitBtn: 'Publish',
  };

  onSubmit(value: unknown) {
    this.submitted = value;
    this.form.enable();
  }
}

// ── Inline layout ─────────────────────────────────────────────────────────────

@Component({
  selector: 'rnf-form-inline-demo',
  standalone: true,
  imports: [FormComponent, InputFieldComponent, DropdownFieldComponent],
  template: `
    <rnf-form
      #form
      [options]="formOptions"
      [template]="fields"
      (formSubmit)="onSubmit($event)" />

    <ng-template #fields let-ctx>
      <rnf-input-field
        name="search"
        label="Search"
        [formGroup]="ctx.formGroup" />
      <rnf-dropdown-field
        name="category"
        label="Category"
        [optionList]="categories"
        [formGroup]="ctx.formGroup" />
      <rnf-input-field
        name="from"
        label="From"
        [formGroup]="ctx.formGroup"
        type="date" />
      <rnf-input-field
        name="to"
        label="To"
        [formGroup]="ctx.formGroup"
        type="date" />
    </ng-template>
  `,
})
class FormInlineDemo {
  @ViewChild('form') form!: FormComponent;
  submitted: unknown;

  categories = ['All', ...CATEGORIES];

  formOptions: Partial<FormOptions> = {
    header: 'Filters',
    layout: 'inline',
    controls: {
      search: [''],
      category: ['All'],
      from: [''],
      to: [''],
    },
    submitBtn: 'Search',
    cancelBtn: false,
  };

  onSubmit(value: unknown) {
    this.submitted = value;
    this.form.enable();
  }
}

// ── Storybook meta ────────────────────────────────────────────────────────────

const meta: Meta<FormBasicDemo> = {
  title: 'Form/FormComponent',
  component: FormBasicDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
\`FormComponent\` is a configurable reactive form container. Define controls via
\`options.controls\` (Angular \`FormBuilder\` syntax) and provide field components via
the \`[template]\` input using \`ng-template let-ctx\`.

The template context exposes \`ctx.formGroup\` which is passed directly to each field:

\`\`\`html
<rnf-form #form [options]="opts" [template]="fields" (formSubmit)="onSubmit($event)" />

<ng-template #fields let-ctx>
  <rnf-input-field    name="name"     [formGroup]="ctx.formGroup" />
  <rnf-dropdown-field name="category" [formGroup]="ctx.formGroup" [optionList]="items" />
  <rnf-typeahead-field name="country" [formGroup]="ctx.formGroup" [values]="countries" />
</ng-template>
\`\`\`

\`\`\`ts
opts: Partial<FormOptions> = {
  controls: {
    name:     ['', Validators.required],
    category: ['', Validators.required],
    country:  [null],
  },
  submitBtn: 'Save',
};

onSubmit(value: unknown) {
  this.service.create(value).subscribe(() => this.form.reset());
}
\`\`\`
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<FormBasicDemo>;

export const BasicInputs: Story = {
  name: 'Basic Inputs (text, number, date)',
};

export const DropdownFields: Story = {
  render: () => ({
    template: '<rnf-form-dropdown-demo />',
    moduleMetadata: { imports: [FormDropdownDemo] },
  }),
};

export const TypeaheadField: Story = {
  name: 'Typeahead Field (single-select)',
  render: () => ({
    template: '<rnf-form-typeahead-demo />',
    moduleMetadata: { imports: [FormTypeaheadDemo] },
  }),
};

export const MultiTypeaheadField: Story = {
  name: 'Multi-typeahead Field (multi-select)',
  render: () => ({
    template: '<rnf-form-multi-typeahead-demo />',
    moduleMetadata: { imports: [FormMultiTypeaheadDemo] },
  }),
};

export const RichTextField: Story = {
  name: 'Rich Text Field (Quill)',
  render: () => ({
    template: '<rnf-form-rich-text-demo />',
    moduleMetadata: { imports: [FormRichTextDemo] },
  }),
};

export const InlineLayout: Story = {
  name: 'Inline Layout (filter bar)',
  render: () => ({
    template: '<rnf-form-inline-demo />',
    moduleMetadata: { imports: [FormInlineDemo] },
  }),
};
