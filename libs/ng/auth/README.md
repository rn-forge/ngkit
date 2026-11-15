# @rn-forge/ng/auth

Same-origin session client, imported from `@rn-forge/ng/auth`.

```ts
provideHttpClient(),
provideRnForgeAuth({ sessionUrl: '/auth/session' }),
```

`provideRnForgeAuth(config?: Partial<AuthConfig>)` shallow-merges and freezes
configuration, including `apiUrls`, and configures Angular XSRF names. URL and
path values must start with `/`; `apiUrls` must be nonempty. Timing values must
be finite and positive, and XSRF names must be nonempty. Invalid configuration
throws synchronously with an `[rn-forge.ng.auth]` message naming the field.

| Field | Default |
| -- | -- |
| `sessionUrl` | `/auth/session` |
| `providersUrl` | `/auth/providers` |
| `loginUrl` | `/auth/login` |
| `passwordLoginUrl` | `/auth/login/password` |
| `logoutUrl` | `/auth/logout` |
| `apiUrls` | `['/api']` |
| `loginPath` | `/login` |
| `errorPath` | `/login/error` |
| `forbiddenPath` | `/forbidden` |
| `loggedOutPath` | `/login` |
| `xsrfCookieName` | `XSRF-TOKEN` |
| `xsrfHeaderName` | `X-XSRF-TOKEN` |
| `loopGuardMs` | `10_000` |
| `expiryLeadMs` | `300_000` |

Startup awaits `AuthService.refresh()`, which fetches `GET sessionUrl`. A `200`
sets `SessionCredentials`; a `401` sets `AnonymousCredentials`. Other startup
errors set anonymous credentials and log once; the app still starts. Startup
never navigates. Outside startup, `refresh()` passes non-401 errors to its
caller.

`AuthService.credentials` is a `Signal<Credentials>`, also available through
`RNF_CREDENTIALS`. Credentials expose `session`, `isAuthenticated`, `roles`,
`hasPermission()` and `hasAnyPermission()`. Permission checks use only the
session's permission keys, never roles. `RNF_PERMISSION` follows these
credentials when the provider is installed; without it the existing zero-config
`AllowAnyPermission` default remains.

`authRouteGuard` checks `route.data.permission` when present; signed-in users
may access routes without a permission key. Anonymous users are sent to
`loginPath` with a `returnTo` query parameter. Permission directives continue to
use `RNF_PERMISSION`. An error-policy interceptor follows.

## Breaking changes

- `provideRnForgeAuthConfig`, `RnForgeAuthConfig`, `AuthFrontendConfig`,
  `AuthBackendConfig`, `DEFAULT_RN_FORGE_AUTH_CONFIG` and
  `RN_FORGE_AUTH_CONFIG_TOKEN` are removed; use `provideRnForgeAuth`,
  `AuthConfig`, `DEFAULT_AUTH_CONFIG` and `RNF_AUTH_CONFIG_TOKEN`.
- JWT storage, bearer headers, `JwtToken`, `JwtCredentials`, `LoginResponse`,
  `UserProfile`, `AuthBackendService` and `authHttpInterceptor` are removed.
- `AuthService` exposes only `credentials` and `refresh()`; its token login,
  logout, navigation and profile APIs are removed.
- Credentials expose `session` instead of `userProfile`; role and scope checks
  are removed. `authComponentMixin` exposes `session` and drops `authService`.
- `disableAuth` and route/backend ignore lists are removed.
