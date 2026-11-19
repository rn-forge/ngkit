import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import { UserSettingsService } from '@rn-forge/ng-bootstrap/auth';
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

describe('HeaderComponent settings listener lifetime', () => {
  class TestHeader extends HeaderComponent {
    color(): string {
      return this.navbarColor();
    }
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [TestHeader],
      providers: [
        provideRouter([]),
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('ignores navbarColor updates after destroy', () => {
    const settings = TestBed.inject(UserSettingsService);
    const destroyed = TestBed.createComponent(TestHeader);
    destroyed.detectChanges();
    const instance = destroyed.componentInstance;
    destroyed.destroy();

    settings.updateSetting('navbarColor', 'dark');

    expect(instance.color()).not.toBe('dark');
  });

  it('picks up updates while mounted', () => {
    const settings = TestBed.inject(UserSettingsService);
    const live = TestBed.createComponent(TestHeader);
    live.detectChanges();

    settings.updateSetting('navbarColor', 'dark');
    expect(live.componentInstance.color()).toBe('dark');
    live.destroy();
  });

  it('returns to the default navbar color after a clear', () => {
    const settings = TestBed.inject(UserSettingsService);
    const live = TestBed.createComponent(TestHeader);
    live.detectChanges();

    settings.updateSetting('navbarColor', 'dark');
    settings.clearStoredSettings();

    expect(live.componentInstance.color()).toBe('default');
    live.destroy();
  });

  describe('navbar color precedence (stored choice beats config)', () => {
    function mountWithConfig(): ComponentFixture<TestHeader> {
      const f = TestBed.createComponent(TestHeader);
      f.componentRef.setInput('options', { navbarColor: 'primary' });
      f.detectChanges();
      return f;
    }

    it('shows the config color on mount with nothing stored', () => {
      const f = mountWithConfig();
      expect(f.componentInstance.color()).toBe('primary');
      f.destroy();
    });

    it('shows the stored color on mount when one was saved', () => {
      TestBed.inject(UserSettingsService).updateSetting(
        'navbarColor',
        'danger',
      );
      const f = mountWithConfig();
      expect(f.componentInstance.color()).toBe('danger');
      f.destroy();
    });

    it('follows a saved update', () => {
      const f = mountWithConfig();
      TestBed.inject(UserSettingsService).updateSetting(
        'navbarColor',
        'success',
      );
      f.detectChanges();
      expect(f.componentInstance.color()).toBe('success');
      f.destroy();
    });

    it('returns to the config color after a clear', () => {
      const settings = TestBed.inject(UserSettingsService);
      const f = mountWithConfig();
      settings.updateSetting('navbarColor', 'success');
      f.detectChanges();
      settings.clearStoredSettings();
      f.detectChanges();
      expect(f.componentInstance.color()).toBe('primary');
      f.destroy();
    });
  });
});
