import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import { StyleHelper } from '@rn-forge/ng-bootstrap';
import { UserSettingsService } from '@rn-forge/ng-bootstrap/auth';
import { ColorMode } from './color-mode';

describe('ColorMode', () => {
  let component: ColorMode;
  let fixture: ComponentFixture<ColorMode>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorMode],
      providers: [
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
      ],
    });
    fixture = TestBed.createComponent(ColorMode);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has configKey "colorMode"', () => {
    expect(component.configKey).toBe('colorMode');
  });
});

describe('ColorMode settings listener lifetime', () => {
  beforeEach(() => {
    localStorage.clear();
    (window as unknown as { matchMedia: unknown }).matchMedia = () => ({
      matches: false,
      addEventListener() {
        /* noop */
      },
    });
    TestBed.configureTestingModule({
      imports: [ColorMode],
      providers: [
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  async function mount(): Promise<ComponentFixture<ColorMode>> {
    const fixture = TestBed.createComponent(ColorMode);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('does not apply colour mode after destroy, and repeated mount/destroy does not multiply', async () => {
    const spy = vi.spyOn(TestBed.inject(StyleHelper), 'setColorMode');
    const settings = TestBed.inject(UserSettingsService);

    for (let i = 0; i < 5; i++) {
      (await mount()).destroy();
    }
    spy.mockClear();

    const live = await mount();
    spy.mockClear();
    settings.updateSetting('colorMode', 'dark');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('dark');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    live.destroy();
  });

  it('shows the current stored value on mount', async () => {
    const spy = vi.spyOn(TestBed.inject(StyleHelper), 'setColorMode');
    TestBed.inject(UserSettingsService).updateSetting('colorMode', 'light');
    const live = await mount();
    expect(spy).toHaveBeenCalledWith('light');
    live.destroy();
  });

  it('follows a clear to the default mode', async () => {
    const settings = TestBed.inject(UserSettingsService);
    const live = await mount();
    settings.updateSetting('colorMode', 'dark');
    const spy = vi.spyOn(TestBed.inject(StyleHelper), 'setColorMode');

    settings.clearStoredSettings();

    expect(spy).toHaveBeenLastCalledWith('auto');
    live.destroy();
  });
});
