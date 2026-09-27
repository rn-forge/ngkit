# E5 — OIDC client auth

**Status:** elaborating · **Owner:** ngkit

**Source:** former roadmap item H5.

Replace `@rn-forge/ng/auth` with a thin wrapper over a maintained OIDC client library, so the SPA is an OIDC client and the identity provider signs users in ([ADR-0006](../../../adr/ADR-0006.md)).

## Why replace, not fix

`@rn-forge/ng/auth` is a custom layer:

- login is a custom `POST` returning snake_case `access_token`/`refresh_token`, not a standard grant;
- the JWT is kept in `localStorage`, readable by any XSS;
- `UserProfile` is a Django user (`is_staff`, `is_superuser`, `groups[].permissions`) decoded from a custom `profile` claim;
- the interceptor attaches the token to every URL except an ignore-list, so it can leak to other origins;
- 401/403 are checked on successful `HttpResponse` events, which Angular never delivers, and **403 sends the user to login**, contradicting HTTP's meaning of 403 (authenticated but not allowed) and causing redirect loops.

**Breaking-change note:** the whole `@rn-forge/ng/auth` surface changes. The release that carries E5 must announce it.

[Back to the board](../../index.md)

| Feature                                                                   | Status      | Scope                                                                       |
| ------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| [F5.1 — Client model](F5.1-client-model.md)                               | elaborating | Decide browser client or BFF.                                               |
| [F5.2 — `provideRnForgeAuth` wrapper](F5.2-auth-wrapper.md)               | elaborating | Choose the OIDC library; the config, guard, signals and error policy.       |
| [F5.3 — Bootstrap auth UI](F5.3-bootstrap-auth-ui.md)                     | elaborating | Remove the login page; keep a user menu and a forbidden page.               |
| [F5.4 — Acceptance against an identity provider](F5.4-auth-acceptance.md) | elaborating | `ng-demo` against a local Keycloak container and a token-verifying backend. |
