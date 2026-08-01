import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
      ],
    });
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has configKey "header"', () => {
    expect(component.configKey).toBe('header');
  });

  describe('menuPositionClass', () => {
    function menuPositionClass(): string {
      return (
        component as unknown as { menuPositionClass: () => string }
      ).menuPositionClass();
    }

    it('returns "me-auto" when the menu position is "left"', () => {
      fixture.componentRef.setInput('options', { position: { menu: 'left' } });
      fixture.detectChanges();
      expect(menuPositionClass()).toBe('me-auto');
    });

    it('returns "mx-auto" when the toggler position is "center"', () => {
      fixture.componentRef.setInput('options', {
        position: { menu: 'center', toggler: 'center' },
      });
      fixture.detectChanges();
      expect(menuPositionClass()).toBe('mx-auto');
    });

    it('falls back to a breakpoint-aware class for any other combination', () => {
      fixture.componentRef.setInput('options', {
        position: { menu: 'center', toggler: 'left' },
        navbar: { breakpoint: 'md' },
      });
      fixture.detectChanges();
      expect(menuPositionClass()).toBe('me-auto mx-md-auto');
    });
  });
});
