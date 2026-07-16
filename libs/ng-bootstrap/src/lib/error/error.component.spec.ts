import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorComponent } from './error.component';

describe('ErrorComponent', () => {
  let component: ErrorComponent;
  let fixture: ComponentFixture<ErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorComponent],
    });
    fixture = TestBed.createComponent(ErrorComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('shows "Page not found" for the default 404 code', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Page not found');
  });

  it('shows "Access denied" when code 403 is provided via options', () => {
    fixture.componentRef.setInput('options', { code: 403 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Access denied');
  });

  it('shows "Internal server error" when code 500 is provided', () => {
    fixture.componentRef.setInput('options', { code: 500 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Internal server error',
    );
  });

  it('shows a custom message when provided', () => {
    fixture.componentRef.setInput('options', {
      code: 404,
      message: 'Resource unavailable',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Resource unavailable');
  });
});
