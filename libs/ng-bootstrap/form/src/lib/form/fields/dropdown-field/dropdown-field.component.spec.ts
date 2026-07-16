import { FormControl, FormGroup } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropdownFieldComponent } from './dropdown-field.component';

describe('DropdownFieldComponent', () => {
  let component: DropdownFieldComponent;
  let fixture: ComponentFixture<DropdownFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownFieldComponent],
    });
    fixture = TestBed.createComponent(DropdownFieldComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', 'status');
    fixture.componentRef.setInput(
      'formGroup',
      new FormGroup({ status: new FormControl('') }),
    );
    fixture.componentRef.setInput('optionList', []);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('getOptionValue returns the string directly for string options', () => {
    expect(component.getOptionValue('admin')).toBe('admin');
  });

  it('getOptionValue reads the valueField (default "code") for object options', () => {
    expect(component.getOptionValue({ code: 'ACTIVE', name: 'Active' })).toBe(
      'ACTIVE',
    );
  });

  it('getOptionLabel returns the string directly for string options', () => {
    expect(component.getOptionLabel('admin')).toBe('admin');
  });

  it('getOptionLabel reads the labelField (default "name") for object options', () => {
    expect(component.getOptionLabel({ code: 'ACTIVE', name: 'Active' })).toBe(
      'Active',
    );
  });

  it('emits selectItem with the selected value on change', () => {
    fixture.componentRef.setInput('optionList', ['alpha', 'beta']);
    fixture.detectChanges();
    let emitted = '';
    component.selectItem.subscribe((v: string) => (emitted = v));
    const select = fixture.nativeElement.querySelector(
      'select',
    ) as HTMLSelectElement;
    if (select) {
      select.value = 'alpha';
      select.dispatchEvent(new Event('change'));
      expect(emitted).toBe('alpha');
    }
  });
});
