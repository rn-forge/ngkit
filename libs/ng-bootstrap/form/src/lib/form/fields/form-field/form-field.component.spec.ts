import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormFieldComponent } from './form-field.component';

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
});
