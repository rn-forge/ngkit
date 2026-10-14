import { DOCUMENT, Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  LocalStorageService,
  PubSubService,
  RNF_BROWSER_STORAGE,
  RouteService,
} from './core.services';
import { RN_FORGE_APP_CONFIG_TOKEN } from './core.config';

const APP_CONFIG = { appName: 'test-app' };

/** Map-backed fake Storage, with switchable throwing on getItem/setItem. */
class FakeStorage implements Storage {
  private map = new Map<string, string>();
  throwOnGetItem: unknown = null;
  throwOnSetItem: unknown = null;

  get length(): number {
    return this.map.size;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    if (this.throwOnGetItem) throw this.throwOnGetItem;
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    if (this.throwOnSetItem) throw this.throwOnSetItem;
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

function namedError(name: string, message = name): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

// ---------------------------------------------------------------------------
// LocalStorageService
// ---------------------------------------------------------------------------

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        LocalStorageService,
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: APP_CONFIG },
      ],
    });
    service = TestBed.inject(LocalStorageService);
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('get()', () => {
    it('returns the stored value under the namespaced key', () => {
      localStorage.setItem('test-app.greeting', 'hello');
      expect(service.get('greeting')).toBe('hello');
    });

    it('returns the empty string default when key is absent', () => {
      expect(service.get('missing')).toBe('');
    });

    it('returns a custom default when key is absent', () => {
      expect(service.get('missing', 'fallback')).toBe('fallback');
    });

    it('does not read keys belonging to another app', () => {
      localStorage.setItem('other-app.key', 'other');
      expect(service.get('key')).toBe('');
    });
  });

  describe('set()', () => {
    it('stores the value under the namespaced key', () => {
      service.set('color', 'blue');
      expect(localStorage.getItem('test-app.color')).toBe('blue');
    });

    it('overwrites an existing value', () => {
      service.set('color', 'blue');
      service.set('color', 'red');
      expect(localStorage.getItem('test-app.color')).toBe('red');
    });
  });

  describe('getJSON() / setJSON()', () => {
    it('round-trips an object through JSON serialisation', () => {
      const obj = { a: 1, b: 'two' };
      service.setJSON('data', obj);
      expect(service.getJSON('data')).toEqual(obj);
    });

    it('returns the supplied default when key is absent', () => {
      expect(service.getJSON<{ x: number }>('missing', { x: 99 })).toEqual({
        x: 99,
      });
    });

    it('returns an empty object when key is absent and no default is given', () => {
      expect(service.getJSON('missing')).toEqual({});
    });
  });

  describe('remove()', () => {
    it('removes the namespaced key', () => {
      service.set('token', 'abc');
      service.remove('token');
      expect(localStorage.getItem('test-app.token')).toBeNull();
    });

    it('does not throw when removing a key that does not exist', () => {
      expect(() => service.remove('nonexistent')).not.toThrow();
    });
  });

  describe('clearAll()', () => {
    it('removes all keys belonging to this app', () => {
      service.set('k1', 'v1');
      service.set('k2', 'v2');
      service.clearAll();
      expect(localStorage.getItem('test-app.k1')).toBeNull();
      expect(localStorage.getItem('test-app.k2')).toBeNull();
    });

    it('preserves keys belonging to other apps', () => {
      localStorage.setItem('other-app.key', 'untouched');
      service.set('k', 'v');
      service.clearAll();
      expect(localStorage.getItem('other-app.key')).toBe('untouched');
    });
  });
});

// ---------------------------------------------------------------------------
// RNF_BROWSER_STORAGE token
// ---------------------------------------------------------------------------

describe('RNF_BROWSER_STORAGE', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('returns jsdom localStorage by default', async () => {
    await TestBed.configureTestingModule({});
    expect(TestBed.inject(RNF_BROWSER_STORAGE)).toBe(localStorage);
  });

  it('returns null when DOCUMENT.defaultView is null (SSR)', async () => {
    await TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: null } }],
    });
    expect(TestBed.inject(RNF_BROWSER_STORAGE)).toBeNull();
  });

  it('returns null when the localStorage getter throws SecurityError', async () => {
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            defaultView: {
              get localStorage(): Storage {
                throw namedError('SecurityError');
              },
            },
          },
        },
      ],
    });
    expect(TestBed.inject(RNF_BROWSER_STORAGE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// LocalStorageService — null storage
// ---------------------------------------------------------------------------

describe('LocalStorageService with null storage', () => {
  let service: LocalStorageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        LocalStorageService,
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: APP_CONFIG },
        { provide: RNF_BROWSER_STORAGE, useValue: null },
      ],
    });
    service = TestBed.inject(LocalStorageService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('tryGet returns unavailable with the fallback', () => {
    expect(service.tryGet('k', 'fallback')).toEqual({
      status: 'failed',
      value: 'fallback',
      reason: 'unavailable',
    });
  });

  it('tryGetJSON returns unavailable with the fallback', () => {
    expect(
      service.tryGetJSON('k', {
        validate: (_v): _v is unknown => true,
        fallback: null,
      }),
    ).toEqual({ status: 'failed', value: null, reason: 'unavailable' });
  });

  it('trySet returns unavailable', () => {
    expect(service.trySet('k', 'v')).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('trySetJSON returns unavailable', () => {
    expect(service.trySetJSON('k', { a: 1 })).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('tryRemove returns unavailable', () => {
    expect(service.tryRemove('k')).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('get throws the rn-forge.ng.core error', () => {
    expect(() => service.get('k')).toThrow('[rn-forge.ng.core]');
  });

  it('getJSON throws the rn-forge.ng.core error', () => {
    expect(() => service.getJSON('k')).toThrow('[rn-forge.ng.core]');
  });

  it('set throws the rn-forge.ng.core error', () => {
    expect(() => service.set('k', 'v')).toThrow('[rn-forge.ng.core]');
  });

  it('setJSON throws the rn-forge.ng.core error', () => {
    expect(() => service.setJSON('k', {})).toThrow('[rn-forge.ng.core]');
  });

  it('remove throws the rn-forge.ng.core error', () => {
    expect(() => service.remove('k')).toThrow('[rn-forge.ng.core]');
  });

  it('clearAll throws the rn-forge.ng.core error', () => {
    expect(() => service.clearAll()).toThrow('[rn-forge.ng.core]');
  });
});

// ---------------------------------------------------------------------------
// LocalStorageService — try* methods against a fake Storage
// ---------------------------------------------------------------------------

describe('LocalStorageService try* methods', () => {
  let service: LocalStorageService;
  let fakeStorage: FakeStorage;

  const isVisitRecord = (v: unknown): v is { visited: boolean } =>
    typeof v === 'object' && v !== null && 'visited' in v;

  beforeEach(async () => {
    fakeStorage = new FakeStorage();
    await TestBed.configureTestingModule({
      providers: [
        LocalStorageService,
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: APP_CONFIG },
        { provide: RNF_BROWSER_STORAGE, useValue: fakeStorage },
      ],
    });
    service = TestBed.inject(LocalStorageService);
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('reads', () => {
    it('tryGet returns found', () => {
      fakeStorage.setItem('test-app.k', 'v');
      expect(service.tryGet('k', 'fallback')).toEqual({
        status: 'found',
        value: 'v',
      });
    });

    it('tryGet returns missing with the fallback', () => {
      expect(service.tryGet('missing', 'fallback')).toEqual({
        status: 'missing',
        value: 'fallback',
      });
    });

    it('tryGet returns failed/security when getItem throws', () => {
      fakeStorage.throwOnGetItem = namedError('SecurityError');
      const result = service.tryGet('k', 'fallback');
      expect(result.status).toBe('failed');
      expect((result as { reason: string }).reason).toBe('security');
    });

    it('tryGetJSON returns failed/malformed for invalid JSON', () => {
      fakeStorage.setItem('test-app.k', 'not json{');
      const result = service.tryGetJSON('k', {
        validate: isVisitRecord,
        fallback: { visited: false },
      });
      expect(result).toMatchObject({ status: 'failed', reason: 'malformed' });
    });

    it('tryGetJSON returns failed/invalid when the validator rejects', () => {
      fakeStorage.setItem('test-app.k', JSON.stringify({ other: true }));
      const result = service.tryGetJSON('k', {
        validate: isVisitRecord,
        fallback: { visited: false },
      });
      expect(result).toMatchObject({ status: 'failed', reason: 'invalid' });
    });

    it('finds a stored JSON null only when validate accepts null', () => {
      fakeStorage.setItem('test-app.k', JSON.stringify(null));

      const rejecting = service.tryGetJSON('k', {
        validate: isVisitRecord,
        fallback: { visited: false },
      });
      expect(rejecting).toMatchObject({ status: 'failed', reason: 'invalid' });

      const accepting = service.tryGetJSON<null>('k', {
        validate: (v): v is null => v === null,
        fallback: 'fallback' as unknown as null,
      });
      expect(accepting).toEqual({ status: 'found', value: null });
    });
  });

  describe('writes', () => {
    it('trySet returns ok', () => {
      expect(service.trySet('k', 'v')).toEqual({ ok: true });
      expect(fakeStorage.getItem('test-app.k')).toBe('v');
    });

    it('trySet returns quota on QuotaExceededError, including the Firefox variant', () => {
      fakeStorage.throwOnSetItem = namedError('QuotaExceededError');
      expect(service.trySet('k', 'v')).toMatchObject({
        ok: false,
        reason: 'quota',
      });

      fakeStorage.throwOnSetItem = namedError('NS_ERROR_DOM_QUOTA_REACHED');
      expect(service.trySet('k', 'v')).toMatchObject({
        ok: false,
        reason: 'quota',
      });
    });

    it('trySetJSON returns unserializable for a cyclic object', () => {
      const cyclic: Record<string, unknown> = {};
      cyclic['self'] = cyclic;
      expect(service.trySetJSON('k', cyclic)).toMatchObject({
        ok: false,
        reason: 'unserializable',
      });
    });

    it('trySetJSON returns unserializable for undefined', () => {
      expect(service.trySetJSON('k', undefined)).toMatchObject({
        ok: false,
        reason: 'unserializable',
      });
    });

    it('tryRemove returns ok on success', () => {
      fakeStorage.setItem('test-app.k', 'v');
      expect(service.tryRemove('k')).toEqual({ ok: true });
      expect(fakeStorage.getItem('test-app.k')).toBeNull();
    });

    it('tryRemove returns failed on failure', () => {
      fakeStorage.removeItem = () => {
        throw namedError('unknown-fail');
      };
      expect(service.tryRemove('k')).toMatchObject({ ok: false });
    });
  });
});

// ---------------------------------------------------------------------------
// LocalStorageService — namespace isolation
// ---------------------------------------------------------------------------

describe('LocalStorageService namespace isolation', () => {
  let sharedStorage: FakeStorage;

  beforeEach(() => {
    sharedStorage = new FakeStorage();
  });

  afterEach(() => TestBed.resetTestingModule());

  async function serviceFor(appName: string): Promise<LocalStorageService> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      providers: [
        LocalStorageService,
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { appName } },
        { provide: RNF_BROWSER_STORAGE, useValue: sharedStorage },
      ],
    });
    return TestBed.inject(LocalStorageService);
  }

  it("neither app reads the other's keys", async () => {
    const app = await serviceFor('app');
    app.set('k', 'app-value');

    const admin = await serviceFor('app-admin');
    expect(admin.get('k')).toBe('');
  });

  it('clearAll on app leaves app-admin and unprefixed keys intact', async () => {
    const app = await serviceFor('app');
    app.set('a', '1');

    const admin = await serviceFor('app-admin');
    admin.set('a', '2');

    sharedStorage.setItem('unprefixed', 'kept');

    const appAgain = await serviceFor('app');
    appAgain.clearAll();

    expect(sharedStorage.getItem('app.a')).toBeNull();
    expect(sharedStorage.getItem('app-admin.a')).toBe('2');
    expect(sharedStorage.getItem('unprefixed')).toBe('kept');
  });
});

// ---------------------------------------------------------------------------
// PubSubService
// ---------------------------------------------------------------------------

class TestPubSub extends PubSubService<string> {
  override initialValue() {
    return 'init';
  }
  emit(value: string) {
    this.publish(value);
  }
}

describe('PubSubService', () => {
  let service: TestPubSub;

  beforeEach(() => {
    service = new TestPubSub();
  });

  it('initialises value from initialValue()', () => {
    expect(service.value).toBe('init');
  });

  it('value getter reflects the latest published value', () => {
    service.emit('updated');
    expect(service.value).toBe('updated');
  });

  it('subscribe callback fires immediately with the current value', () => {
    const received: string[] = [];
    service.subscribe((v) => received.push(v));
    expect(received).toEqual(['init']);
  });

  it('subscribe callback fires on each publish', () => {
    const received: string[] = [];
    service.subscribe((v) => received.push(v));
    service.emit('a');
    service.emit('b');
    expect(received).toEqual(['init', 'a', 'b']);
  });

  it('returns a Subscription that can be unsubscribed', () => {
    const received: string[] = [];
    const sub = service.subscribe((v) => received.push(v));
    sub.unsubscribe();
    service.emit('after-unsub');
    expect(received).toEqual(['init']); // only the initial emission
  });
});

// ---------------------------------------------------------------------------
// RouteService
// ---------------------------------------------------------------------------

describe('RouteService', () => {
  let service: RouteService;
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [RouteService, provideRouter([])],
    });
    service = TestBed.inject(RouteService);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('currentUrl', () => {
    it('delegates to router.url', () => {
      vi.spyOn(router, 'url', 'get').mockReturnValue('/some/path');
      expect(service.currentUrl).toBe('/some/path');
    });
  });

  describe('currentPath', () => {
    it('delegates to location.path()', () => {
      vi.spyOn(location, 'path').mockReturnValue('/current');
      expect(service.currentPath).toBe('/current');
    });
  });

  describe('queryParams', () => {
    it('returns an object (from the deepest active route snapshot)', () => {
      expect(typeof service.queryParams).toBe('object');
    });
  });

  describe('navigateByUrl()', () => {
    it('calls router.navigateByUrl with replaceUrl and reload-on-same-url options', () => {
      const spy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      service.navigateByUrl('/dashboard');
      expect(spy).toHaveBeenCalledWith('/dashboard', {
        onSameUrlNavigation: 'reload',
        replaceUrl: true,
      });
    });
  });

  describe('navigateByUrl() extras', () => {
    it('lets callers override defaults and pass other NavigationExtras', () => {
      const spy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      service.navigateByUrl('/a', { replaceUrl: false, state: { x: 1 } });
      expect(spy).toHaveBeenCalledWith('/a', {
        onSameUrlNavigation: 'reload',
        replaceUrl: false,
        state: { x: 1 },
      });
    });
  });

  describe('goBack()', () => {
    it('calls location.back()', () => {
      const spy = vi.spyOn(location, 'back');
      service.goBack();
      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
