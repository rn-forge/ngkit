import { HttpErrorResponse } from '@angular/common/http';
import { Component, SimpleChange, SimpleChanges } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseComponent } from './core.components';
import { DEBUG_MODE } from './core.utils';

// ---------------------------------------------------------------------------
// Concrete subclass for testing
// ---------------------------------------------------------------------------

@Component({ standalone: true, template: '' })
class TestComponent extends BaseComponent {
  // Expose delayedAfterViewInit so we can spy on it
  override delayedAfterViewInit(): void {
    super.delayedAfterViewInit();
  }
}

// ---------------------------------------------------------------------------
// BaseComponent
// ---------------------------------------------------------------------------

describe('BaseComponent', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
    });
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    DEBUG_MODE.set(false);
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  describe('creation', () => {
    it('creates the component without error', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  });

  describe('DEBUG getter', () => {
    it('returns false when DEBUG_MODE signal is false', () => {
      DEBUG_MODE.set(false);
      expect(component.DEBUG).toBe(false);
    });

    it('returns true when DEBUG_MODE signal is set to true', () => {
      DEBUG_MODE.set(true);
      expect(component.DEBUG).toBe(true);
    });
  });

  describe('lifecycle hooks', () => {
    beforeEach(() => fixture.detectChanges());

    it('ngOnInit is callable without error', () => {
      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('ngDoCheck is callable without error', () => {
      expect(() => component.ngDoCheck()).not.toThrow();
    });

    it('ngAfterContentInit is callable without error', () => {
      expect(() => component.ngAfterContentInit()).not.toThrow();
    });

    it('ngAfterContentChecked is callable without error', () => {
      expect(() => component.ngAfterContentChecked()).not.toThrow();
    });

    it('ngAfterViewInit is callable without error', () => {
      expect(() => component.ngAfterViewInit()).not.toThrow();
    });

    it('ngAfterViewChecked is callable without error', () => {
      expect(() => component.ngAfterViewChecked()).not.toThrow();
    });

    it('ngOnDestroy is callable without error', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('ngOnChanges is callable with a SimpleChanges object', () => {
      const changes: SimpleChanges = {
        someInput: new SimpleChange(undefined, 'newValue', true),
      };
      expect(() => component.ngOnChanges(changes)).not.toThrow();
    });
  });

  describe('delayedAfterViewInit', () => {
    it('is directly callable without error', () => {
      expect(() => component.delayedAfterViewInit()).not.toThrow();
    });

    it('can be spied on — confirms it is a real overrideable method', () => {
      const spy = vi
        .spyOn(component, 'delayedAfterViewInit')
        .mockImplementation(() => undefined);
      component.delayedAfterViewInit();
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('handleErrorResponse()', () => {
    it('calls console.error with the provided message', () => {
      const spy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const response = new HttpErrorResponse({
        error: { message: 'Something failed', error: 'SERVER_ERROR' },
        status: 500,
      });
      component.handleErrorResponse(response, 'Custom message');
      expect(spy).toHaveBeenCalledOnce();
      const [msg] = spy.mock.calls[0];
      expect(msg).toContain('Custom message');
    });

    it('falls back to response.error.message when no message is provided', () => {
      const spy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const response = new HttpErrorResponse({
        error: { message: 'Server boom', error: 'BOOM' },
        status: 500,
      });
      component.handleErrorResponse(response);
      expect(spy).toHaveBeenCalledOnce();
      const [msg] = spy.mock.calls[0];
      expect(msg).toContain('Server boom');
    });
  });
});
