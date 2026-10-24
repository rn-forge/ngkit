# E8 — `@rn-forge/ng-tailwind` package

**Status:** deferred · **Owner:** ngkit

**Entry criteria:** the owner schedules it.

**Source:** former roadmap item T1.

A new presentation library alongside `ng-bootstrap`, with the same packaging patterns and none of its Bootstrap imports ([ADR-0002](../../../adr/ADR-0002.md): it must not import `ng-bootstrap`).

**Depends on:** [E1](../E1-packaging-and-compatibility/index.md) (done).

[Back to the board](../../index.md)

## Design

Before scaffolding, invoke the `nx-generate` skill; discover the generator schema, don't guess CLI flags. Mirror library packaging patterns, not Bootstrap imports.

Files to create: `libs/ng-tailwind/{package.json,ng-package.json,project.json}`, public index, component sources/specs/stories, assets, README, demo integration. Use standalone signal-input OnPush components. Angular/CDK are framework peers; `ng` is a same-release peer only for actual shared behavior use.

CSS distribution decision: ship prebuilt, scoped component CSS with neutral namespaced semantic tokens and a separately exported optional Tailwind v4 bridge. Consumers must not scan `node_modules` or safelist dynamically composed utilities to get functioning components. No preflight, global body resets, fonts, html color scheme or forced brand palette. A plain Angular consumer must also render.

- Scope selectors to toolkit hosts/classes (`rnf-*`), not `.btn`, `.state`, etc.
- Define tokens for surface/text/muted/border/focus/success/warning/danger/neutral. An app maps its own tokens in one bridge; brand tokens and typography stay in the app. Document dark-mode and overlay inheritance.
- Verify token contrast using rendered/computed CSS, not copied constants. Choose contrast-verified (WCAG AA) defaults.
- Export assets in `package.json`, use the existing post-build exports patch pattern if ng-packagr requires it, and verify imports from the packed artifact.
- Add a docs API entry and Storybook/examples without replacing Bootstrap's docs.

The release configuration for a new publishable library (`release.projects`, `preVersionCommand`, the manifest-root pair, package metadata, the `dryRun` policy, packing without a rebuild, and CI package verification for the third artifact) is the checklist in [Developing ngkit](../../../guides/development.md#adding-a-publishable-library). Plan those config changes separately, under the repository's approval rules.

## Prior art: an application's `ui/` folder

A consumer application builds its own `ui/` folder to these conventions, so this package can later be extracted from it by a move and a rename. The conventions are this epic's design, written here in full:

- **Selectors.** Element `rnf-<name>`, attribute `button[rnfButton], a[rnfButton]`, host class `rnf-<name>`. An application that builds ahead uses its own prefix in the same positions.
- **Tokens.** Components read only `--rnf-*` custom properties and contain no colour literal. The token list is: `surface-0` to `surface-3`, `text`, `text-muted`, `text-subtle`, `border`, `border-strong`, `focus`, `accent`, `accent-muted`, `on-accent`, `success`, `warning`, `danger`, `neutral`, `radius-control`, `radius`, `radius-lg`, `radius-pill`, `font-ui`, `font-data`.
- **Defaults.** A neutral, WCAG AA light and dark pair, selected by `prefers-color-scheme` on the toolkit's own scope; the package sets no `color-scheme` on `html` and forces no palette. `font-ui` defaults to `inherit` and `font-data` to `ui-monospace, monospace`, so typography stays with the application, which sets both in its one bridge. Verify contrast from computed CSS, as above.
- **Tailwind v4 bridge without preflight.** The optional bridge imports Tailwind's theme and utilities layers only (no preflight), sets `source(none)` so the package is not scanned, and maps Tailwind's colour, radius and font scales onto `var(--rnf-*)` in one `@theme inline` block. Component templates use no Tailwind utilities, so a consumer without Tailwind renders them.
- **Behaviour from Angular.** ARIA roles, keyboard interaction and focus come from `@angular/aria` and `@angular/cdk` ([ADR-0001](../../../adr/ADR-0001.md) principle 1), which become this package's peers; a component adds tokens, styles and inputs on top. Each component styles in its own emulated-encapsulation stylesheet, with no `::ng-deep` or `:host-context`.

## Open questions

- E8 and [F12.10](../E12-on-demand-features/index.md#f1210--rn-forgeng-material) (`ng-material`) each add a second presentation package. Decide whether both are wanted.
