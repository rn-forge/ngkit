# E5 — Design: the session wire contract

**Epic:** [E5](index.md) · **Settled by:**
[S5.1.2](F5.1-client-model.md#s512-settle-the-wire-contract)

The HTTP contract between `@rn-forge/ng/auth` and the application backend, and
the client behaviour built on it. Settled by S5.1.2 (2026-11-14), checked
against the two server libraries [F5.4](F5.4-auth-acceptance.md) pins, which
serve the same routes: `rn-forge-fastapi` at `rn-forge-fastapi-v0.4.1` and
`rn-forge-django` at `rn-forge-django-v0.6.1`. A change here is a change to
every E5 feature. Every URL, cookie and header name below is client
configuration with these values as defaults, so a backend that differs needs
configuration, not code.

[Back to E5](index.md)

## Deployment

- **One origin.** The SPA, `/api` and `/auth` are served from one origin, with a
  reverse proxy routing `/api` and `/auth` to the backend. The session cookie
  is then first-party and Angular's XSRF support works, because Angular adds
  the XSRF header to same-origin relative URLs only.
- **The SPA's own routes live outside the backend's prefix.** The proxy sends
  everything under `/auth` to the backend, so the login, error, forbidden and
  logged-out pages are SPA routes elsewhere ([Client routes](#client-routes)).
  The backend's error route is configured to the client's `errorPath`.
- Sibling subdomains and other sites are out of the first version
  ([F5.5](F5.5-situational-client-extensions.md)). A SPA on another site puts
  a proxy on its own origin.

## Routes the client uses

| Method | Path | Client use | Response |
| -- | -- | -- | -- |
| `GET` | `/auth/providers` | Login page options | `200` list of `{ id, name, kind }` |
| `GET` | `/auth/login/{provider}?return_to=<path>` | Start a login, by full-page navigation (`window.location.assign`), never `HttpClient` | `302` to the identity provider |
| `POST` | `/auth/login/password` | Local password login, `{ username, password }` with the XSRF header | `200` session body, `401` problem for any failure, or `429` problem when rate limited |
| `GET` | `/auth/session` | Current user and permissions; the client's only source of identity. Reading it does not extend the idle timeout | `200` session body, or `401` problem |
| `POST` | `/auth/logout` | End the session, with the XSRF header | `200 { "redirect": <url or null> }`, or `401` when there is no session |

The backend's callback and back-channel logout routes, and its "sign out
everywhere" route (`POST /auth/logout/all`), are not called by the client.
`GET /auth/login/development` is an ordinary navigating login; in debug mode
only, it also takes `?account=<id>` and signs that fixture account in without a
page, which is how e2e tests sign in. A login that ends in the backend redirects
the browser to `return_to`, or to the client's error route.

## Provider kinds

`kind` is one of a closed list, and decides what the login page does:

| `kind` | Login page action |
| -- | -- |
| `oidc` | Navigate to `/auth/login/{id}` |
| `oauth2` | Navigate to `/auth/login/{id}` |
| `development` | Navigate to `/auth/login/{id}`; the backend lists fixture accounts, in debug mode only |
| `password` | Show the username and password form |

An unknown `kind` is skipped and logged with the `[rn-forge.ng.auth]` prefix.
There is no `saml` kind: a SAML identity provider is reached through a broker
the backend federates with, and is listed as `oidc`.

## Session body

Field names are camelCase, like every other body on the wire. The body is the
backend's own resource, not an ID token; its values come from the standard
claims.

```json
{
  "subject": "8f14e45f",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "picture": "https://example.com/ada.png",
  "provider": "workspace",
  "roles": ["store-manager"],
  "permissions": ["orders.list", "orders.read", "orders.update"],
  "attributes": { "orgUnits": [{ "type": "store", "id": "S-104" }] },
  "authTime": "2026-09-27T09:12:44Z",
  "amr": ["pwd", "mfa"],
  "expiresAt": "2026-09-27T17:12:44Z"
}
```

- `permissions` are dotted lowercase keys, `<resource>.<action>` with an
  optional namespace. They are the UI's unit of authorization, the same keys
  the server enforces.
- `roles` are for display. The client offers no role check that gates a feature,
  and no scope check: scopes limit delegated tokens and do not apply to a
  session.
- `attributes` is application-defined and holds only what the UI needs.
- `expiresAt` is the session's absolute end. Idle expiry is not announced; it
  surfaces as a `401`.
- `subject` is the backend's account ID, not the identity provider's `sub`.
- `name`, `email`, `picture`, `attributes`, `authTime` and `amr` may be absent;
  a backend that stores no profile sends none of the first three.

## Error route codes

The backend redirects a failed login to the client's error route (default
`/auth/error`) with `?error=<code>`. The client also uses the route itself. The
codes are a closed list; any other code is shown as `unknown`.

| Code | Raised by | Meaning |
| -- | -- | -- |
| `access_denied` | Backend | The user cancelled, or the identity provider refused the login. |
| `account_not_provisioned` | Backend | The login succeeded but the application has no account for the user. |
| `login_failed` | Backend | The callback could not be verified or the login transaction expired. |
| `session_not_established` | Client | A `401` arrived right after a login returned (the loop guard below). |

The error route path is configured on both sides: the backend's default is
`/auth/error`, which is under its own prefix, so it is set to the client's
`errorPath` ([Deployment](#deployment)). The backend also refuses a `return_to`
outside its allowed prefixes, by redirecting to the error route or to its
default target.

## Client routes

The SPA routes the client navigates to, with their defaults. None is under
`/auth`.

| Route | Default | Use |
| -- | -- | -- |
| `loginPath` | `/login` | The login page, with `?returnTo=<path>` |
| `errorPath` | `/login/error` | The error page, with `?error=<code>` |
| `forbiddenPath` | `/forbidden` | Where a `403` lands |
| `loggedOutPath` | `/login` | Where `logout()` goes when `redirect` is `null` |

## CSRF

- The backend sets a CSRF token cookie readable by script, `XSRF-TOKEN`, and
  checks it against the `X-XSRF-TOKEN` header on unsafe methods (Angular's
  default names), plus an `Origin` check. It also refuses an unsafe request
  sent with `Sec-Fetch-Site: cross-site`.
- `GET /auth/session` sets the CSRF cookie whether or not the user is signed in,
  so the first `POST /auth/login/password` already carries a token.
- The client configures `withXsrfConfiguration` with the backend's cookie and
  header names.
- A rejected token is a `403` problem whose `type` ends in `csrf-failed`; a
  permission denial has another `type`. The backend rotates the token at login
  and logout, so a tab opened before either can hold a stale one.

## Client behaviour

| Event | Client action |
| -- | -- |
| Startup | Fetch `/auth/session`. `200` sets `RNF_CREDENTIALS`; `401` sets anonymous credentials. Neither redirects: this `401` is a probe. |
| Anonymous user reaches a guarded route | With one provider of a navigating kind, start its login with the route as `return_to`. Otherwise go to the login page with `returnTo`. |
| `401` from an API request | Clear credentials and do what a guarded route does with the current URL, unless the loop guard trips. Concurrent `401`s start one navigation. |
| Loop guard | The client records in `sessionStorage` when it starts a login. A `401` within 10 seconds (configurable) after the return navigation goes to the error route with `session_not_established`. |
| `403` of type `csrf-failed` | Refetch `/auth/session`, which renews the CSRF cookie, and retry the request once. A second `csrf-failed` is passed to the caller. |
| Any other `403` | Refetch `/auth/session` once (parallel `403`s share one refetch), then go to the forbidden route. A `403` never clears credentials or starts a login. |
| Window regains focus | Refetch `/auth/session` so feature toggles follow permission changes. There is no interval refetch. |
| `expiresAt` approaching | Raise a warning signal 5 minutes (configurable) before it, offering a fresh login. The client never polls to keep a session alive. |
| Logout | `POST /auth/logout`, clear credentials, then follow `redirect` with a full-page navigation, or route to `loggedOutPath` when it is `null`. A `401` from logout means the session had already ended, and is handled the same way. |

**Which requests the interceptor handles.** Only those under `apiUrls` (default
`['/api']`); any other URL passes through untouched. The client's own calls to
`/auth/session`, `/auth/login/password` and `/auth/logout` are never handled by
it: their statuses are answered as the rows above and
[Routes](#routes-the-client-uses) say, so a `401` from the password login is a
failed password on the form, not a new login.

The client acts on the status alone. A `401` from a route that accepts only
sessions carries no `WWW-Authenticate` challenge, and the client does not read
one when present.

`return_to` is always a relative path within the application; the client never
sends an absolute URL.

## What the client never does

- Store a token, or call `localStorage` or `jwt-decode` for auth.
- Add an `Authorization` header.
- Start a login with `HttpClient`.
- Offer a switch that turns auth off. Running applications and e2e tests use the
  backend's development provider; unit tests and stories seed a session
  through the testing provider.
