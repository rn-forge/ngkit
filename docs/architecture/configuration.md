# Configuration

Every ngkit UI component extends `ConfigurableComponent<TOptions>` (`libs/ng-bootstrap/src/lib/bootstrap.component.ts`), which explains the whole library's shape. Consequently every component has:

- `[options]`: `Partial<TOptions>`, the declarative config bag (columns, buttons, header text, form controls…).
- `[htmlAttributes]`: arbitrary attributes applied to the host element.
- A `configKey`: where this component's app-wide defaults live in the merged config.
- Effective config resolved lowest → highest priority: **`defaultOptions()` → app-wide config at `configKey` → `[options]` input → runtime `updateOptions()`/`mergeOptions()`**.

Different defaults on different pages mean different `[options]`. Same defaults everywhere are set once in the relevant `provideRnForgeXConfig()`, not repeated at every call site.

## Pages

Pages extend `AbstractPage<TOptions>` (root entry point, auth-free) or `AbstractAuthPage<TOptions>` (`/auth` entry point, adds `isAuthenticated`/`userProfile`/`hasPermission()`). Both wire a `@ViewChild(AlertComponent) alert` plus `handleErrorResponse(httpError)`, which surfaces failed HTTP subscriptions through the page's alert. This split is a deliberate dependency boundary: using `AbstractPage` keeps `@rn-forge/ng/auth` out of the bundle entirely.

The [building-an-app guide](../guides/building-an-app.md) keeps its own copy of this model because it is pasted whole into other contexts. This page is the maintainer's version.

Sources: `libs/ng-bootstrap/src/lib/bootstrap.component.ts`, `libs/ng-bootstrap/src/lib/abstract-page.ts`, `libs/ng-bootstrap/auth/src/lib/abstract-auth-page.ts`.
