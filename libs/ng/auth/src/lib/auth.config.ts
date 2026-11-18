// external imports
import { InjectionToken, Signal, signal } from '@angular/core';

// internal imports
import {
  AllowAnyPermission,
  AnonymousCredentials,
  Credentials,
  Permission,
} from './auth.types';

/** Same-origin session endpoints, client routes and security settings. */
export interface AuthConfig {
  /** Session probe URL; default: '/auth/session'. */
  readonly sessionUrl: string;
  /** Provider list URL; default: '/auth/providers'. */
  readonly providersUrl: string;
  /** Navigating login URL, with the provider ID appended; default: '/auth/login'. */
  readonly loginUrl: string;
  /** Password login URL; default: '/auth/login/password'. */
  readonly passwordLoginUrl: string;
  /** Logout URL; default: '/auth/logout'. */
  readonly logoutUrl: string;
  /** API prefixes handled by auth policy; default: ['/api']. */
  readonly apiUrls: readonly string[];
  /** Client login route; default: '/login'. */
  readonly loginPath: string;
  /** Client login error route; default: '/login/error'. */
  readonly errorPath: string;
  /** Client permission-denied route; default: '/forbidden'. */
  readonly forbiddenPath: string;
  /** Client route after logout without a redirect; default: '/login'. */
  readonly loggedOutPath: string;
  /** Readable XSRF cookie name; default: 'XSRF-TOKEN'. */
  readonly xsrfCookieName: string;
  /** XSRF request header name; default: 'X-XSRF-TOKEN'. */
  readonly xsrfHeaderName: string;
  /** Login loop detection window in milliseconds; default: 10_000. */
  readonly loopGuardMs: number;
  /** Session expiry warning lead time in milliseconds; default: 300_000. */
  readonly expiryLeadMs: number;
}

/** Frozen session client defaults, including the API prefix array. */
export const DEFAULT_AUTH_CONFIG: AuthConfig = Object.freeze({
  sessionUrl: '/auth/session',
  providersUrl: '/auth/providers',
  loginUrl: '/auth/login',
  passwordLoginUrl: '/auth/login/password',
  logoutUrl: '/auth/logout',
  apiUrls: Object.freeze(['/api']),
  loginPath: '/login',
  errorPath: '/login/error',
  forbiddenPath: '/forbidden',
  loggedOutPath: '/login',
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  loopGuardMs: 10_000,
  expiryLeadMs: 300_000,
});

/** Session configuration token; defaults to DEFAULT_AUTH_CONFIG. */
export const RNF_AUTH_CONFIG_TOKEN = new InjectionToken<AuthConfig>(
  'RNF_AUTH_CONFIG_TOKEN',
  {
    factory: () => DEFAULT_AUTH_CONFIG,
  },
);

/** Permission policy token; defaults to AllowAnyPermission without auth wiring. */
export const RNF_PERMISSION = new InjectionToken<Permission>('RNF_PERMISSION', {
  factory: () => new AllowAnyPermission(),
});

/** Reactive identity token; defaults to anonymous credentials without auth wiring. */
export const RNF_CREDENTIALS = new InjectionToken<Signal<Credentials>>(
  'RNF_CREDENTIALS',
  {
    factory: () => signal(new AnonymousCredentials()),
  },
);
