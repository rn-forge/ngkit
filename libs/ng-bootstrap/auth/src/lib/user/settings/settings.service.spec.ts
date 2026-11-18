import { TestBed } from '@angular/core/testing';
import { RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import { UserSettingsService } from './settings.service';

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
