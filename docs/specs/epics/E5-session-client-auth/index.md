# E5 — Session client auth

|  |  |
| -- | -- |
| **State** | Active |
| **Start Date** | 2026-11-14 |

**Release:** F5.1 is in [Release 3](../../../releases/release-3/index.md); F5.2,
F5.3 and F5.4 are in [Release 4](../../../releases/release-4/index.md).

**Source:** former roadmap item H5; redefined by the owner on 2026-10-16 around
a backend-for-frontend session model.

Replace `@rn-forge/ng/auth` with a client for a same-origin backend session, so
the browser never handles a token. The backend runs every login protocol (OIDC,
SAML through a broker, social login, local password, a development provider) and
keeps an `HttpOnly` session cookie. The SPA starts logins by full-page
navigation, reads the signed-in user and their effective permissions from the
backend, and mirrors those permissions in the UI without enforcing them
([ADR-0006](../../../adr/ADR-0006.md)). [Design](design.md) holds the wire
contract every feature builds against.

## Why replace, not fix

`@rn-forge/ng/auth` is a custom layer:

- login is a custom `POST` returning snake_case `access_token`/`refresh_token`,
  not a standard grant;
- the JWT is kept in `localStorage`, readable by any XSS;
- `UserProfile` is a Django user (`is_staff`, `is_superuser`,
  `groups[].permissions`) decoded from a custom `profile` claim;
- the interceptor attaches the token to every URL except an ignore-list, so it
  can leak to other origins;
- 401/403 are checked on successful `HttpResponse` events, which Angular never
  delivers, and **403 sends the user to login**, contradicting HTTP's meaning
  of 403 (authenticated but not allowed) and causing redirect loops.

## What stays

The authorization vocabulary already matches the contract: `RNF_PERMISSION` with
`hasPermission`/`hasAnyPermission`, the permission directives, the navbar's
`item.permission`, and the crud manager's `<permissionKey>.<action>` checks.
Only the source of the credentials changes, so those consumers keep working
unchanged.

**Breaking-change note:** the configuration, credentials types, services, guard
and the whole `@rn-forge/ng-bootstrap/auth` surface change. The release that
carries E5 must announce it.

[Back to the board](../../index.md)

<!-- BEGIN derived features -->

| Feature | State | Iteration | Stories |
| -- | -- | -- | -- |
| [F5.1 — Client model and wire contract](F5.1-client-model.md) | Closed | release-3 | 2 Closed |
| [F5.2 — `@rn-forge/ng/auth` session client](F5.2-auth-wrapper.md) | Closed | release-4 | 5 Closed |
| [F5.3 — Bootstrap auth UI](F5.3-bootstrap-auth-ui.md) | Closed | release-4 | 3 Closed |
| [F5.4 — Acceptance against a session backend](F5.4-auth-acceptance.md) | New | release-4 | 2 New |
| [F5.5 — Situational client extensions](F5.5-situational-client-extensions.md) | New | deferred | — |

<!-- END derived features -->

## Open questions

None. **Which server library serves the contract for F5.4?** Answered
2026-11-14: `rn-forge-fastapi` at `rn-forge-fastapi-v0.4.1`, the primary
backend, with `rn-forge-django` at `rn-forge-django-v0.6.1` as the second, each
pinned in its fixture's manifest as
[F4.3](../E4-standard-resource-screen/F4.3-wire-acceptance.md) pins them. The
check is in [F5.4](F5.4-auth-acceptance.md#context).
