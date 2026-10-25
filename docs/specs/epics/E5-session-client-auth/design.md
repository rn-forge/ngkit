# E5 — Design: the session wire contract

**Epic:** [E5](index.md) · **Settled by:** [S5.1.2](F5.1-client-model.md#s512--settle-the-wire-contract)

The HTTP contract between `@rn-forge/ng/auth` and the application backend, and the client behaviour built on it. It is a proposal until S5.1.2 is done; a change here is a change to every E5 feature. Every URL, cookie and header name below is client configuration with these values as defaults, so a backend that differs needs configuration, not code.

[Back to E5](index.md)

## Deployment

- **One origin.** The SPA, `/api` and `/auth` are served from one origin, with a reverse proxy routing `/api` and `/auth` to the backend. The session cookie is then first-party and Angular's XSRF support works, because Angular adds the XSRF header to same-origin relative URLs only.
- Sibling subdomains and other sites are out of the first version ([F5.5](F5.5-situational-client-extensions.md)). A SPA on another site puts a proxy on its own origin.

## Routes the client uses

| Method | Path                                      | Client use                                                                            | Response                             |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------ |
| `GET`  | `/auth/providers`                         | Login page options                                                                    | `200` list of `{ id, name, kind }`   |
| `GET`  | `/auth/login/{provider}?return_to=<path>` | Start a login, by full-page navigation (`window.location.assign`), never `HttpClient` | `302` to the identity provider       |
| `POST` | `/auth/login/password`                    | Local password login, `{ username, password }` with the XSRF header                   | `200` session body, or `401` problem |
| `GET`  | `/auth/session`                           | Current user and permissions; the client's only source of identity                    | `200` session body, or `401` problem |
| `POST` | `/auth/logout`                            | End the session, with the XSRF header                                                 | `200 { "redirect": <url or null> }`  |

The backend's callback, SAML, metadata and back-channel logout routes are not called by the client. A login that ends in the backend redirects the browser to `return_to`, or to the client's error route.

## Provider kinds

`kind` is one of a closed list, and decides what the login page does:

| `kind`        | Login page action                                                                      |
| ------------- | -------------------------------------------------------------------------------------- |
| `oidc`        | Navigate to `/auth/login/{id}`                                                         |
| `oauth2`      | Navigate to `/auth/login/{id}`                                                         |
| `saml`        | Navigate to `/auth/login/{id}`                                                         |
| `development` | Navigate to `/auth/login/{id}`; the backend lists fixture accounts, in debug mode only |
| `password`    | Show the username and password form                                                    |

An unknown `kind` is skipped and logged with the `[rn-forge.ng.auth]` prefix.

## Session body

Field names are camelCase, like every other body on the wire. The body is the backend's own resource, not an ID token; its values come from the standard claims.

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

- `permissions` are dotted lowercase keys, `<resource>.<action>` with an optional namespace. They are the UI's unit of authorization, the same keys the server enforces.
- `roles` are for display. The client offers no role check that gates a feature, and no scope check: scopes limit delegated tokens and do not apply to a session.
- `attributes` is application-defined and holds only what the UI needs.
- `expiresAt` is the session's absolute end. Idle expiry is not announced; it surfaces as a `401`.
- `name`, `email`, `picture`, `attributes`, `authTime` and `amr` may be absent.

## Error route codes

The backend redirects a failed login to the client's error route (default `/auth/error`) with `?error=<code>`. The client also uses the route itself. The codes are a closed list; any other code is shown as `unknown`.

| Code                      | Raised by | Meaning                                                              |
| ------------------------- | --------- | -------------------------------------------------------------------- |
| `access_denied`           | Backend   | The user cancelled, or the identity provider refused the login.      |
| `account_not_provisioned` | Backend   | The login succeeded but the application has no account for the user. |
| `login_failed`            | Backend   | The callback could not be verified or the login transaction expired. |
| `session_not_established` | Client    | A `401` arrived right after a login returned (the loop guard below). |

The error route path is configured on both sides.

## CSRF

- The backend sets a CSRF token cookie readable by script, and checks it against a header on unsafe methods, plus an `Origin` check.
- `GET /auth/session` sets the CSRF cookie whether or not the user is signed in, so the first `POST /auth/login/password` already carries a token.
- The client configures `withXsrfConfiguration` with the backend's cookie and header names.

## Client behaviour

| Event                                  | Client action                                                                                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup                                | Fetch `/auth/session`. `200` sets `RNF_CREDENTIALS`; `401` sets anonymous credentials. Neither redirects: this `401` is a probe.                                                 |
| Anonymous user reaches a guarded route | With one provider of a navigating kind, start its login with the route as `return_to`. Otherwise go to the login page with `returnTo`.                                           |
| `401` from any other request           | Clear credentials and do what a guarded route does with the current URL, unless the loop guard trips.                                                                            |
| Loop guard                             | The client records in `sessionStorage` when it starts a login. A `401` within a short window after the return navigation goes to the error route with `session_not_established`. |
| `403`                                  | Refetch `/auth/session` once (parallel `403`s share one refetch), then go to the forbidden route. A `403` never clears credentials or starts a login.                            |
| Window regains focus                   | Refetch `/auth/session` so feature toggles follow permission changes.                                                                                                            |
| `expiresAt` approaching                | Raise a warning signal a configurable lead time before it, offering a fresh login. The client never polls to keep a session alive.                                               |
| Logout                                 | `POST /auth/logout`, clear credentials, then follow `redirect` with a full-page navigation, or route to the logged-out path when it is `null`.                                   |

The client acts on the status alone. A `401` from a route that accepts only sessions carries no `WWW-Authenticate` challenge, and the client does not read one when present.

`return_to` is always a relative path within the application; the client never sends an absolute URL.

## What the client never does

- Store a token, or call `localStorage` or `jwt-decode` for auth.
- Add an `Authorization` header.
- Start a login with `HttpClient`.
- Offer a switch that turns auth off. Running applications and e2e tests use the backend's development provider; unit tests and stories seed a session through the testing provider.
