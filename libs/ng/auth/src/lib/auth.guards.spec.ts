import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import {
  RNF_AUTH_CONFIG_TOKEN,
  RNF_PERMISSION,
  RnForgeAuthConfig,
} from './auth.config';
import { AuthService } from './auth.services';
import { AllowAnyPermission, Permission } from './auth.types';
import { authRouteGuard } from './auth.guards';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRoute(data: Record<string, unknown> = {}): ActivatedRouteSnapshot {
  return { data } as unknown as ActivatedRouteSnapshot;
}
function mockState(url: string): RouterStateSnapshot {
  return { url } as unknown as RouterStateSnapshot;
}

const CONFIG: RnForgeAuthConfig = {
  frontend: {
    disableAuth: false,
    loginPath: '/auth?mode=login',
    ignoreAppRoutes: ['/auth'],
  },
  backend: {},
};

// ---------------------------------------------------------------------------
// authRouteGuard
// ---------------------------------------------------------------------------

describe('authRouteGuard', () => {
  let authService: AuthService;
  let mockPermission: Permission;

  function runGuard(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return TestBed.runInInjectionContext(() => authRouteGuard(route, state));
  }

  beforeEach(async () => {
    localStorage.clear();
    mockPermission = new AllowAnyPermission();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: RN_FORGE_APP_CONFIG_TOKEN,
          useValue: { appName: 'test-app' },
        },
        { provide: RNF_AUTH_CONFIG_TOKEN, useValue: CONFIG },
        { provide: RNF_PERMISSION, useValue: mockPermission },
      ],
    });
    authService = TestBed.inject(AuthService);
    vi.spyOn(authService, 'sendToLogin').mockImplementation(() => undefined);
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('ignoreAppRoutes passthrough', () => {
    it('returns true when URL contains an ignored pattern', () => {
      expect(runGuard(mockRoute(), mockState('/auth?mode=login'))).toBe(true);
    });

    it('returns true for any URL that includes the pattern as a substring', () => {
      expect(runGuard(mockRoute(), mockState('/auth/callback'))).toBe(true);
    });

    it('does not skip a URL that does not match any ignored pattern', () => {
      expect(runGuard(mockRoute(), mockState('/dashboard'))).toBe(false);
    });
  });

  describe('unauthenticated user', () => {
    it('returns false', () => {
      expect(runGuard(mockRoute(), mockState('/dashboard'))).toBe(false);
    });

    it('calls sendToLogin with the current URL', () => {
      runGuard(mockRoute(), mockState('/dashboard'));
      expect(authService.sendToLogin).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('authenticated user — no permission requirement', () => {
    beforeEach(() => {
      vi.spyOn(authService, 'isAuthenticated', 'get').mockReturnValue(true);
    });

    it('returns true when route.data has no permission field', () => {
      expect(runGuard(mockRoute(), mockState('/dashboard'))).toBe(true);
    });

    it('returns true when route.data is an empty object', () => {
      expect(runGuard(mockRoute({}), mockState('/home'))).toBe(true);
    });
  });

  describe('authenticated user — with permission requirement', () => {
    beforeEach(() => {
      vi.spyOn(authService, 'isAuthenticated', 'get').mockReturnValue(true);
    });

    it('returns true when RNF_PERMISSION grants the required permission', () => {
      vi.spyOn(mockPermission, 'hasPermission').mockReturnValue(true);
      expect(
        runGuard(mockRoute({ permission: 'admin' }), mockState('/admin')),
      ).toBe(true);
    });

    it('returns false when RNF_PERMISSION denies the required permission', () => {
      vi.spyOn(mockPermission, 'hasPermission').mockReturnValue(false);
      expect(
        runGuard(mockRoute({ permission: 'admin' }), mockState('/admin')),
      ).toBe(false);
    });

    it('does not call sendToLogin when blocking due to missing permission', () => {
      vi.spyOn(mockPermission, 'hasPermission').mockReturnValue(false);
      runGuard(mockRoute({ permission: 'admin' }), mockState('/admin'));
      expect(authService.sendToLogin).not.toHaveBeenCalled();
    });
  });
});
