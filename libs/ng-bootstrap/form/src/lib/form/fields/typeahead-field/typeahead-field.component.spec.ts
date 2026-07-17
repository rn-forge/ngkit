import { FormControl, FormGroup } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TypeaheadFieldComponent } from './typeahead-field.component';

describe('TypeaheadFieldComponent', () => {
  let component: TypeaheadFieldComponent;
  let fixture: ComponentFixture<TypeaheadFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeaheadFieldComponent],
    });
    fixture = TestBed.createComponent(TypeaheadFieldComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', 'search');
    fixture.componentRef.setInput(
      'formGroup',
      new FormGroup({ search: new FormControl('') }),
    );
    fixture.componentRef.setInput('values', ['alpha', 'beta', 'gamma']);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('formatter() returns the string value for a string item', () => {
    expect(component.formatter('alpha')).toBe('alpha');
  });

  it('formatFields defaults to empty object', () => {
    expect(component.formatFields()).toEqual({});
  });
});
