# E5 — Session client auth

**Status:** elaborating · **Owner:** ngkit · **Release:** [Release 2](../../../releases/release-2/index.md)

**Source:** former roadmap item H5; redefined by the owner on 2026-10-16 around a backend-for-frontend session model.

Replace `@rn-forge/ng/auth` with a client for a same-origin backend session, so the browser never handles a token. The backend runs every login protocol (OIDC, SAML, social login, local password, a development provider) and keeps an `HttpOnly` session cookie. The SPA starts logins by full-page navigation, reads the signed-in user and their effective permissions from the backend, and mirrors those permissions in the UI without enforcing them ([ADR-0006](../../../adr/ADR-0006.md)). [Design](design.md) holds the wire contract every feature builds against.

## Why replace, not fix

`@rn-forge/ng/auth` is a custom layer:

- login is a custom `POST` returning snake_case `access_token`/`refresh_token`, not a standard grant;
- the JWT is kept in `localStorage`, readable by any XSS;
- `UserProfile` is a Django user (`is_staff`, `is_superuser`, `groups[].permissions`) decoded from a custom `profile` claim;
- the interceptor attaches the token to every URL except an ignore-list, so it can leak to other origins;
- 401/403 are checked on successful `HttpResponse` events, which Angular never delivers, and **403 sends the user to login**, contradicting HTTP's meaning of 403 (authenticated but not allowed) and causing redirect loops.

## What stays

The authorization vocabulary already matches the contract: `RNF_PERMISSION` with `hasPermission`/`hasAnyPermission`, the permission directives, the navbar's `item.permission`, and the crud manager's `<permissionKey>.<action>` checks. Only the source of the credentials changes, so those consumers keep working unchanged.

**Breaking-change note:** the configuration, credentials types, services, guard and the whole `@rn-forge/ng-bootstrap/auth` surface change. The release that carries E5 must announce it.

[Back to the board](../../index.md)

| Feature                                                                       | Status      | Scope                                                                                                                  |
| ----------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| [F5.1 — Client model and wire contract](F5.1-client-model.md)                 | elaborating | Accept the session model in ADR-0006; settle the wire contract in [Design](design.md).                                 |
| [F5.2 — `@rn-forge/ng/auth` session client](F5.2-auth-wrapper.md)             | elaborating | Configuration, session bootstrap, login and logout, the 401/403 policy, guards, expiry warning and a testing provider. |
| [F5.3 — Bootstrap auth UI](F5.3-bootstrap-auth-ui.md)                         | elaborating | Provider chooser with password form, auth error page, forbidden page, user menu and expiry warning.                    |
| [F5.4 — Acceptance against a session backend](F5.4-auth-acceptance.md)        | elaborating | `ng-demo` e2e against the backend fixture signed in through its development provider.                                  |
| [F5.5 — Situational client extensions](F5.5-situational-client-extensions.md) | deferred    | Cross-origin credentials, step-up, tenant switching and a browser-client profile, each when an application needs it.   |

## Open questions

- **Which server library serves the contract for F5.4?** The fixture pins a server library by release tag, as [F4.3](../E4-standard-resource-screen/F4.3-wire-acceptance.md) does. No released server library serves the auth routes in [Design](design.md) yet; F5.4 waits for one (its entry criterion).
