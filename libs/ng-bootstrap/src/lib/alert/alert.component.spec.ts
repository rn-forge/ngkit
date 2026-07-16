import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertComponent } from './alert.component';

describe('AlertComponent', () => {
  let component: AlertComponent;
  let fixture: ComponentFixture<AlertComponent>;

  function container(): HTMLElement {
    return fixture.nativeElement.querySelector('.mt-2') as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertComponent],
    });
    fixture = TestBed.createComponent(AlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('is hidden by default', () => {
    expect(container().classList).toContain('d-none');
  });

  it('show() makes the alert visible', () => {
    component.show('success', 'Saved!');
    fixture.detectChanges();
    expect(container().classList).not.toContain('d-none');
  });

  it('show() displays the message text', () => {
    component.show('success', 'Operation complete');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Operation complete');
  });

  it('hide() conceals the alert', () => {
    component.show('info', 'Hello');
    fixture.detectChanges();
    component.hide();
    fixture.detectChanges();
    expect(container().classList).toContain('d-none');
  });

  it('success() makes the alert visible with the success message', () => {
    component.success('All good');
    fixture.detectChanges();
    expect(container().classList).not.toContain('d-none');
    expect(fixture.nativeElement.textContent).toContain('All good');
  });

  it('error() makes the alert visible with the error message', () => {
    component.error('Something failed');
    fixture.detectChanges();
    expect(container().classList).not.toContain('d-none');
    expect(fixture.nativeElement.textContent).toContain('Something failed');
  });

  it('info() makes the alert visible with the info message', () => {
    component.info('FYI');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('FYI');
  });

  it('warning() makes the alert visible with the warning message', () => {
    component.warning('Be careful');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Be careful');
  });
});
