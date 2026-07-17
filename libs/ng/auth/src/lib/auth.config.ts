// external imports
import { InjectionToken, Signal, signal } from '@angular/core';

// internal imports
import {
  AllowAnyPermission,
  AnonymousCredentials,
  Credentials,
  Permission,
} from './auth.types';

// type definitions
/** Frontend (Angular router / directive) auth configuration. */
export interface AuthFrontendConfig {
  /** Route to redirect unauthenticated users to. Default: `'/auth?mode=login'`. */
  loginPath?: string;
  /** Route to redirect users to after logout. Default: `'/auth?mode=logout'`. */
  logoutPath?: string;
  /** App routes that bypass the `authRouteGuard` (e.g. `['/auth']`). */
  ignoreAppRoutes?: string[];
  /** Expected JWT `aud` claim value used for token validation. */
  audience?: string;
  /** Required permissions for the guard to allow navigation. */
  permissions?: string[];
  /** Set to `true` during development to bypass all auth checks. */
  disableAuth?: boolean;
}

/** Backend (HTTP interceptor / API) auth configuration. */
export interface AuthBackendConfig {
  /** API root prefix for auth endpoints (e.g. `'/auth'`). */
  authApiRoot?: string;
  /** Login endpoint path relative to `authApiRoot`. Default: `'/login'`. */
  loginPath?: string;
  /** Logout endpoint path relative to `authApiRoot`. Default: `'/logout'`. */
  logoutPath?: string;
  /** URL patterns that skip the `authHttpInterceptor` (e.g. `['/auth/']`). */
  ignoreBackendURLs?: string[];
  /** Custom token refresh function; called when the interceptor receives a 401. */
  refreshToken?: (token: string) => Promise<string>;
}

/**
 * Top-level auth configuration for `@rn-forge/ng/auth`.
 * Pass to {@link provideRnForgeAuthConfig} at app bootstrap.
 */
export interface RnForgeAuthConfig {
  frontend?: AuthFrontendConfig;
  backend?: AuthBackendConfig;
}

// default config
export const DEFAULT_RN_FORGE_AUTH_CONFIG: RnForgeAuthConfig = {
  frontend: {
    loginPath: '/auth?mode=login',
    logoutPath: '/auth?mode=logout',
    ignoreAppRoutes: ['/auth'],
    disableAuth: true,
  },
  backend: {
    authApiRoot: '/auth',
    loginPath: '/login',
    logoutPath: '/logout',
    ignoreBackendURLs: ['/auth/'],
  },
};

// ---------------------------------------------------------------------------
// Config token (both names supported for backward compat during transition)
// ---------------------------------------------------------------------------

export const RNF_AUTH_CONFIG_TOKEN = new InjectionToken<RnForgeAuthConfig>(
  'RNF_AUTH_CONFIG_TOKEN',
  {
    providedIn: 'root',
    factory: () => DEFAULT_RN_FORGE_AUTH_CONFIG,
  },
);

/** @deprecated Use RNF_AUTH_CONFIG_TOKEN */
export const RN_FORGE_AUTH_CONFIG_TOKEN = RNF_AUTH_CONFIG_TOKEN;

// ---------------------------------------------------------------------------
// RNF_PERMISSION — authorization policy token
// Zero-config default: allow everything (no auth required)
// ---------------------------------------------------------------------------

export const RNF_PERMISSION = new InjectionToken<Permission>('RNF_PERMISSION', {
  factory: () => new AllowAnyPermission(),
});

// ---------------------------------------------------------------------------
// RNF_CREDENTIALS — user identity token (Signal<Credentials>)
// Zero-config default: anonymous unauthenticated user
// ---------------------------------------------------------------------------

export const RNF_CREDENTIALS = new InjectionToken<Signal<Credentials>>(
  'RNF_CREDENTIALS',
  {
    factory: () => signal(new AnonymousCredentials()),
  },
);
