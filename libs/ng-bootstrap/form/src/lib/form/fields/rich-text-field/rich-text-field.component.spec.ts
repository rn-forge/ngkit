import { FormControl, FormGroup } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RichTextFieldComponent } from './rich-text-field.component';

describe('RichTextFieldComponent', () => {
  let component: RichTextFieldComponent;
  let fixture: ComponentFixture<RichTextFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextFieldComponent],
    });
    fixture = TestBed.createComponent(RichTextFieldComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', 'body');
    fixture.componentRef.setInput(
      'formGroup',
      new FormGroup({ body: new FormControl('') }),
    );
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('styles input defaults to { height: "100px" }', () => {
    expect(component.styles()).toEqual({ height: '100px' });
  });
});
