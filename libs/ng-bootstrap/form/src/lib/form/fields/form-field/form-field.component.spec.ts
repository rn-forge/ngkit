import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormFieldComponent,
  ParentFieldComponent,
} from './form-field.component';

describe('FormFieldComponent', () => {
  let component: FormFieldComponent;
  let fixture: ComponentFixture<FormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFieldComponent],
    });
    fixture = TestBed.createComponent(FormFieldComponent);
    component = fixture.componentInstance;
    // field and template are required inputs accessed in the template;
    // do not call detectChanges to avoid NG0950
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component without DI errors', () => {
    expect(component).toBeTruthy();
  });

  it('label input defaults to true', () => {
    expect(component.label()).toBe(true);
  });

  it('icon input defaults to empty string', () => {
    expect(component.icon()).toBe('');
  });

  describe('readonly', () => {
    function setField(htmlAttributes: Record<string, string>) {
      fixture.componentRef.setInput('field', {
        htmlAttributes: () => htmlAttributes,
      } as unknown as ParentFieldComponent);
    }

    it('is false when no readonly attribute is present', () => {
      setField({});
      expect(component.readonly()).toBe(false);
    });

    it('is true when the readonly attribute is "readonly"', () => {
      setField({ readonly: 'readonly' });
      expect(component.readonly()).toBe(true);
    });

    it('is true when the readonly attribute is "true"', () => {
      setField({ readonly: 'true' });
      expect(component.readonly()).toBe(true);
    });
  });
});
