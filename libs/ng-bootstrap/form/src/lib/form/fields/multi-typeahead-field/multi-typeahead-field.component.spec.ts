import { FormControl, FormGroup } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultiTypeaheadFieldComponent } from './multi-typeahead-field.component';

describe('MultiTypeaheadFieldComponent', () => {
  let component: MultiTypeaheadFieldComponent;
  let fixture: ComponentFixture<MultiTypeaheadFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiTypeaheadFieldComponent],
    });
    fixture = TestBed.createComponent(MultiTypeaheadFieldComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', 'tags');
    fixture.componentRef.setInput(
      'formGroup',
      new FormGroup({ tags: new FormControl('') }),
    );
    fixture.componentRef.setInput('values', ['alpha', 'beta']);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('writeValue() sets the internal value without error', () => {
    expect(() => component.writeValue(['alpha'])).not.toThrow();
  });
});
