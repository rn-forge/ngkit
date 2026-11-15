# @rn-forge/ng/auth

Same-origin session client, imported from `@rn-forge/ng/auth`.

```ts
provideHttpClient(withInterceptors([authInterceptor])),
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

`login(provider, returnTo)` starts a full-page login and records its start in
`sessionStorage`. `returnTo` must start with `/` followed by neither `/` nor
`\`; invalid paths throw synchronously before any side effect.

`loginWithPassword(username, password)` posts local credentials using Angular's
XSRF support and emits the new credentials without navigating. A `401` becomes
`PasswordLoginError` with reason `invalid-credentials`; a `429` uses
`rate-limited`. Other HTTP errors pass through. Failures leave credentials
unchanged.

`providers()` fetches the backend provider list, keeping `oidc`, `oauth2`,
`development` and `password` kinds and warning for each unknown kind.

`logout()` posts to the backend, clears credentials, and follows its redirect
with full-page navigation, or routes to `loggedOutPath` when there is no
redirect. A `401` also clears credentials and routes to `loggedOutPath`; other
errors pass through without changing credentials. It completes without emitting
a value. In the demo, reload the page to sign in again.

`AuthService.credentials` is a `Signal<Credentials>`, also available through
`RNF_CREDENTIALS`. Credentials expose `session`, `isAuthenticated`, `roles`,
`hasPermission()` and `hasAnyPermission()`. Permission checks use only the
session's permission keys, never roles. `RNF_PERMISSION` follows these
credentials when the provider is installed; without it the existing zero-config
`AllowAnyPermission` default remains.

`authRouteGuard` checks `route.data.permission` when present; signed-in users
may access routes without a permission key. Anonymous users are sent to
`loginPath` with a `returnTo` query parameter. Permission directives continue to
use `RNF_PERMISSION`.

Install `authInterceptor` with
`provideHttpClient(withInterceptors([authInterceptor]))`. It handles relative
URLs equal to an `apiUrls` entry or beneath it, ignoring query strings. Absolute
URLs, nonmatching prefixes and the session, providers, password-login and logout
endpoints pass through untouched. It handles HTTP errors only and never adds an
identity header.

A handled `401` clears credentials and calls `startLogin()` with the current
route. That method discovers providers: one navigating provider with no password
provider starts full-page login; otherwise, including discovery failure, it
opens `loginPath` with `returnTo`. Parallel failures start one login until
credentials become authenticated again. At startup, a recorded login start is
consumed; a `401` within `loopGuardMs` of that return opens `errorPath` with
`error=session_not_established` instead. The original error reaches the caller.
`clear()` sets anonymous credentials locally without a backend call.

A `403` whose problem `type` ends in `csrf-failed` refetches the session and
retries once, replacing the configured XSRF header with the current cookie token
on unsafe methods. A second failure reaches the caller; if the refetch fails,
the original `403` reaches the caller. Other `403`s share one in-flight session
refetch, then navigate once to `forbiddenPath`; each caller receives its
original error. A `403` never calls `clear()` or starts login.

## Breaking changes

- `provideRnForgeAuthConfig`, `RnForgeAuthConfig`, `AuthFrontendConfig`,
  `AuthBackendConfig`, `DEFAULT_RN_FORGE_AUTH_CONFIG` and
  `RN_FORGE_AUTH_CONFIG_TOKEN` are removed; use `provideRnForgeAuth`,
  `AuthConfig`, `DEFAULT_AUTH_CONFIG` and `RNF_AUTH_CONFIG_TOKEN`.
- JWT storage, bearer headers, `JwtToken`, `JwtCredentials`, `LoginResponse`,
  `UserProfile`, `AuthBackendService` and `authHttpInterceptor` are removed.
- `AuthService` exposes session credentials, refresh, provider login, password
  login, providers and logout; its former token and profile APIs are removed.
- Credentials expose `session` instead of `userProfile`; role and scope checks
  are removed. `authComponentMixin` exposes `session` and drops `authService`.
- `disableAuth` and route/backend ignore lists are removed.
