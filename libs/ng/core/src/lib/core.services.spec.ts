import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  LocalStorageService,
  PubSubService,
  RouteService,
} from './core.services';
import { RN_FORGE_APP_CONFIG_TOKEN } from './core.config';

const APP_CONFIG = { appName: 'test-app' };

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

  describe('goBack()', () => {
    it('calls location.back()', () => {
      const spy = vi.spyOn(location, 'back');
      service.goBack();
      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
