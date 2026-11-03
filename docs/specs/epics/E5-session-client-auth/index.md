# E5 — Session client auth

| | |
| -- | -- |
| **State** | New |

**Release:** [Release 3](../../../releases/release-3/index.md)

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

<!-- BEGIN derived features -->
<!-- END derived features -->

## Open questions

- **Which server library serves the contract for F5.4?** The fixture pins a server library by release tag, as [F4.3](../E4-standard-resource-screen/F4.3-wire-acceptance.md) does. No released server library serves the auth routes in [Design](design.md) yet; F5.4 waits for one (its entry criterion).
