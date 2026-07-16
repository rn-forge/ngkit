import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    });
    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  function btn(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }

  it('creates the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders a button element', () => {
    fixture.componentRef.setInput('options', { type: 'button' });
    fixture.detectChanges();
    expect(btn()).not.toBeNull();
  });

  it('displays the label text', () => {
    fixture.componentRef.setInput('options', { type: 'button', label: 'Save' });
    fixture.detectChanges();
    expect(btn().textContent?.trim()).toBe('Save');
  });

  it('applies btn-primary class when class is primary', () => {
    fixture.componentRef.setInput('options', {
      type: 'button',
      class: 'primary',
    });
    fixture.detectChanges();
    expect(btn().className).toContain('btn-primary');
  });

  it('applies btn-outline-primary when outline is true', () => {
    fixture.componentRef.setInput('options', {
      type: 'button',
      class: 'primary',
      outline: true,
    });
    fixture.detectChanges();
    expect(btn().className).toContain('btn-outline-primary');
  });

  it('applies btn-close class when type is close', () => {
    fixture.componentRef.setInput('options', { type: 'close' });
    fixture.detectChanges();
    expect(btn().className).toContain('btn-close');
  });

  it('disables the button when disabled option is true', () => {
    fixture.componentRef.setInput('options', {
      type: 'button',
      disabled: true,
    });
    fixture.detectChanges();
    expect(btn().disabled).toBe(true);
  });

  it('emits buttonClick when the button is clicked', () => {
    fixture.componentRef.setInput('options', { type: 'button' });
    fixture.detectChanges();
    let emitted = false;
    component.buttonClick.subscribe(() => (emitted = true));
    btn().click();
    expect(emitted).toBe(true);
  });

  it('calls the callback option instead of emitting buttonClick', () => {
    const callback = vi.fn();
    fixture.componentRef.setInput('options', { type: 'button', callback });
    fixture.detectChanges();
    let emitted = false;
    component.buttonClick.subscribe(() => (emitted = true));
    btn().click();
    expect(callback).toHaveBeenCalledOnce();
    expect(emitted).toBe(false);
  });
});
