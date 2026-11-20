import { TestBed } from '@angular/core/testing';
import {
  LocalStorageService,
  RN_FORGE_APP_CONFIG_TOKEN,
} from '@rn-forge/ng/core';
import { UserSettingsService } from './settings.service';
import {
  DEFAULT_USER_SETTINGS,
  USER_SETTINGS_STORAGE_KEY,
} from './settings.types';

describe('UserSettingsService change listeners', () => {
  let service: UserSettingsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
      ],
    });
    service = TestBed.inject(UserSettingsService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('delivers the current value immediately', () => {
    service.updateSetting('colorMode', 'dark');
    const listener = vi.fn();
    service.registerChangeListener('colorMode', listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('dark');
  });

  it('delivers the default value when nothing is stored', () => {
    const listener = vi.fn();
    service.registerChangeListener('colorMode', listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      service.currentUserSettings['colorMode'],
    );
  });

  it('delivers later updates to live listeners only for their key', () => {
    const a = vi.fn();
    const b = vi.fn();
    const other = vi.fn();
    service.registerChangeListener('colorMode', a);
    service.registerChangeListener('colorMode', b);
    service.registerChangeListener('navbarColor', other);
    other.mockClear();

    service.updateSetting('colorMode', 'light');

    expect(a).toHaveBeenLastCalledWith('light');
    expect(b).toHaveBeenLastCalledWith('light');
    expect(other).not.toHaveBeenCalled();
  });

  it('does not deliver after dispose', () => {
    const kept = vi.fn();
    const disposed = vi.fn();
    service.registerChangeListener('colorMode', kept);
    const dispose = service.registerChangeListener('colorMode', disposed);
    kept.mockClear();
    disposed.mockClear();

    dispose();
    service.updateSetting('colorMode', 'dark');

    expect(kept).toHaveBeenCalledTimes(1);
    expect(disposed).not.toHaveBeenCalled();
    expect(() => dispose()).not.toThrow();
  });

  it('does not multiply callbacks on repeated register and dispose', () => {
    const stale = vi.fn();
    for (let i = 0; i < 5; i++) {
      service.registerChangeListener('colorMode', stale)();
    }
    const live = vi.fn();
    service.registerChangeListener('colorMode', live);
    stale.mockClear();
    live.mockClear();

    service.updateSetting('colorMode', 'dark');

    expect(live).toHaveBeenCalledTimes(1);
    expect(stale).not.toHaveBeenCalled();
  });
});

describe('UserSettingsService reset', () => {
  const DEFAULTS = {
    theme: 'default',
    colorMode: 'auto',
    navbarColor: 'default',
  };
  let service: UserSettingsService;

  function configure(): UserSettingsService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
      ],
    });
    return TestBed.inject(UserSettingsService);
  }

  beforeEach(() => {
    localStorage.clear();
    service = configure();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('restores the declared defaults on every clear', () => {
    service.updateSetting('colorMode', 'dark');
    service.clearStoredSettings();
    service.updateSetting('colorMode', 'light');
    service.clearStoredSettings();

    expect({ ...service.currentUserSettings }).toEqual(DEFAULTS);
    expect({ ...DEFAULT_USER_SETTINGS }).toEqual(DEFAULTS);
  });

  it('does not change another service instance', () => {
    service.clearStoredSettings();
    service.updateSetting('navbarColor', 'danger');

    localStorage.clear();
    const other = configure();

    expect(other.currentUserSettings.navbarColor).toBe('default');
  });

  it('clear persists the empty override set', () => {
    service.updateSetting('colorMode', 'dark');
    service.clearStoredSettings();

    const localStorageService = TestBed.inject(LocalStorageService);
    expect(
      localStorageService.getJSON(USER_SETTINGS_STORAGE_KEY, { x: 1 }),
    ).toEqual({});
    expect(service.storedUserSettings).toEqual({});
  });

  it('clear notifies live listeners with the reset value', () => {
    const color = vi.fn();
    const navbar = vi.fn();
    service.registerChangeListener('colorMode', color);
    service.registerChangeListener('navbarColor', navbar);
    service.updateSetting('colorMode', 'dark');
    service.updateSetting('navbarColor', 'danger');
    color.mockClear();
    navbar.mockClear();

    service.clearStoredSettings();

    expect(color).toHaveBeenCalledTimes(1);
    expect(color).toHaveBeenLastCalledWith('auto');
    expect(navbar).toHaveBeenCalledTimes(1);
    expect(navbar).toHaveBeenLastCalledWith('default');
  });

  it('does not notify a disposed listener on clear', () => {
    const disposed = vi.fn();
    const dispose = service.registerChangeListener('colorMode', disposed);
    dispose();
    disposed.mockClear();

    service.updateSetting('colorMode', 'dark');
    service.clearStoredSettings();

    expect(disposed).not.toHaveBeenCalled();
  });

  it('a listener registered after a clear gets the reset value', () => {
    service.registerChangeListener('colorMode', vi.fn());
    service.updateSetting('colorMode', 'dark');
    service.clearStoredSettings();

    const late = vi.fn();
    service.registerChangeListener('colorMode', late);

    expect(late).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledWith('auto');
  });

  it('a custom key is notified undefined on clear and other keys are untouched', () => {
    const custom = vi.fn();
    const untouched = vi.fn();
    service.registerChangeListener('x', custom);
    service.registerChangeListener('theme', untouched);
    service.updateSetting('x', 'one');

    service.clearStoredSettings();

    expect(custom).toHaveBeenLastCalledWith(undefined);
    expect(service.currentUserSettings['x']).toBeUndefined();
    expect(untouched).toHaveBeenLastCalledWith('default');
  });

  it('ordinary updates keep working after a clear', () => {
    const listener = vi.fn();
    service.registerChangeListener('colorMode', listener);
    service.clearStoredSettings();

    service.updateSetting('colorMode', 'dark');

    expect(service.storedUserSettings).toEqual({ colorMode: 'dark' });
    expect(service.currentUserSettings.colorMode).toBe('dark');
    expect(listener).toHaveBeenLastCalledWith('dark');
    expect({ ...DEFAULT_USER_SETTINGS }).toEqual(DEFAULTS);
  });

  it('reports whether a key is explicitly stored', () => {
    expect(service.hasStoredSetting('navbarColor')).toBe(false);
    service.updateSetting('navbarColor', 'danger');
    expect(service.hasStoredSetting('navbarColor')).toBe(true);
    service.clearStoredSettings();
    expect(service.hasStoredSetting('navbarColor')).toBe(false);
  });
});
