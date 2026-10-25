# E8 — `@rn-forge/ng-tailwind` package

**Status:** in progress · **Owner:** ngkit

**Source:** former roadmap item T1; elaborated at the owner's request, 2026-10-24, against a survey of three applications to be rebuilt on kiln's Angular baseline.

A new presentation library alongside `ng-bootstrap`, with the same packaging patterns and none of its Bootstrap imports ([ADR-0002](../../../adr/ADR-0002.md): it must not import `ng-bootstrap`). This epic delivers the package, its CSS contract and one component, proven from the packed tarball; the component families are [E9](../E9-presentation-primitives/index.md) and [E10](../E10-connected-menu/index.md).

**Depends on:** [E1](../E1-packaging-and-compatibility/index.md) (done). **Release:** [Release 2](../../../releases/release-2/index.md) (owner decision, 2026-10-24).

[Back to the board](../../index.md)

| Feature                                                             | Status      | Scope                                                                                 |
| ------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| [F8.1 — The package and its release wiring](F8.1-package.md)        | in progress | `libs/ng-tailwind`, the fixed release group, CSS exports, Compodoc and Storybook.     |
| [F8.2 — Tokens, tones, base sheet and bridge](F8.2-css-contract.md) | planned     | `tokens.css`, `base.css`, `tailwind.css`, under [ADR-0008](../../../adr/ADR-0008.md). |
| [F8.3 — `rnfButton`](F8.3-button.md)                                | planned     | The first component, on `<button>` and `<a>`.                                         |
| [F8.4 — Consumer and accessibility acceptance](F8.4-acceptance.md)  | planned     | Plain and Tailwind consumers from the tarball; WCAG AA in both schemes, in a browser. |

## Design

The CSS distribution decision is [ADR-0008](../../../adr/ADR-0008.md) (accepted 2026-10-24): prebuilt, scoped component CSS on `--rnf-*` tokens, light and dark through `color-scheme` and `light-dark()`, and an optional Tailwind v4 bridge that only maps theme variables. Consumers do not scan `node_modules` or safelist classes, the package sets no preflight, reset, font, `color-scheme` or brand palette, and a plain Angular consumer renders. The token list and bridge mapping are in [F8.2](F8.2-css-contract.md); packaging and release wiring are in [F8.1](F8.1-package.md).

Components are standalone, OnPush, with signal inputs. Angular, the CDK and `@angular/aria` are framework peers, added with the first component that imports each; `ng` is a same-release peer only for shared behaviour actually used.

**No `ConfigurableComponent`.** Components take signal inputs and no options object, so the package does not need `ng-bootstrap`'s four-layer options machinery. [F12.9](../E12-on-demand-features/index.md#f129--configurablecomponent-into-ngcore)'s trigger (a second presentation package is scheduled) does not make it a dependency of this epic. An application-wide default, when one is needed, is a `provideRnForge<Area>Config` token ([ADR-0001](../../../adr/ADR-0001.md)).

**Selector prefix `rnf`, shared with `ng-bootstrap`** (owner decision, 2026-10-24; `rnf` = rn-forge). Angular matches selectors per standalone component's `imports`, so an application migrating screen by screen can use both packages. Component styles are emulated-encapsulated, so host classes do not leak between them. `ng-tailwind` has its own Storybook and consumer fixtures, so no workspace application loads both. Only one template importing both packages' same-named component conflicts, which is unsupported.

**No icon dependency.** Icons are projected content. The surveyed applications use one icon library, but the package does not name it.

**Not in this epic.** An `ng-plugin` generator that writes the stylesheet imports for an application is follow-up work for [E11](../E11-workspace-generators/index.md) once this package ships.

## Prior art: an application's `ui/` folder

A consumer application builds its own `ui/` folder to these conventions, so this package can later be extracted from it by a move and a rename. The conventions are this epic's design, written here in full:

- **Selectors.** Element `rnf-<name>`, attribute `button[rnfButton], a[rnfButton]`, host class `rnf-<name>`. An application that builds ahead uses its own prefix in the same positions. The prefix is `rnf` for both packages ([see Design](#design)).
- **Tokens.** Components read only `--rnf-*` custom properties and contain no colour literal. The list is [F8.2's](F8.2-css-contract.md#tokens); its first names are the ones this section fixed before 2026-10-24, so an application built to them renames a prefix and nothing else.
- **Defaults.** A neutral, WCAG AA light and dark pair as `light-dark()` values, following the application's `color-scheme`; the package sets no `color-scheme` on `html` and forces no palette. `font-ui` defaults to `inherit` and `font-data` to `ui-monospace, monospace`, so typography stays with the application, which sets both in its one bridge. Contrast is verified from computed CSS.
- **Tailwind v4 bridge without preflight.** The optional bridge is one `@theme inline` block mapping Tailwind's colour, radius, font and size namespaces onto `var(--rnf-*)` and clearing the default palette. The application imports Tailwind (with or without preflight) and declares its own `@source`. Component templates use no Tailwind utilities, so a consumer without Tailwind renders them.
- **Behaviour from Angular.** ARIA roles, keyboard interaction and focus come from `@angular/aria` and `@angular/cdk` ([ADR-0001](../../../adr/ADR-0001.md) principle 1), which become this package's peers; a component adds tokens, styles and inputs on top. Each component styles in its own emulated-encapsulation stylesheet, inside `@layer rnf`, with no `::ng-deep` or `:host-context`.

## Survey, 2026-10-24

Three applications are to be rebuilt on kiln's Angular baseline (a stock Nx Angular application with SCSS, esbuild, Vitest and `@rn-forge/ng`). Two are Angular 22 already, on Tailwind v4 with `@theme inline` over their own semantic tokens; the third is a Svelte application whose rebuild plan builds a `ui/` folder to the conventions above. What they share shaped this epic:

- **The same token set, written three times.** Surfaces in elevation steps, three text strengths, two border strengths, an accent with on-accent text, success, warning, danger and (in two) info, a radius scale, motion durations and an easing curve, elevation shadows, and a dense type scale (10–14 px). Status washes and borders were derived with `color-mix()` from one tone colour in two of them. Hence F8.2's additions and its tone mechanism.
- **Dark-first, pinned by the application.** All three set `color-scheme: dark`; one adds a light theme by attribute. Hence `light-dark()` rather than `prefers-color-scheme` ([ADR-0008](../../../adr/ADR-0008.md)).
- **The same base layer.** Each wrote body surface and text, a `:focus-visible` ring from the accent, a reduced-motion switch and tabular numbers on tables. Hence the opt-in `base.css`.
- **A guard against palette drift.** One application ships a script failing the build on Tailwind's default palette utilities; another's spec asks for a lint rule. The bridge's `--color-*: initial` makes those utilities produce nothing.
- **A button in every application,** one of them a wrapper component whose host carries `routerLink`. Hence F8.3.

The component patterns the survey found beyond the button are recorded on [E9](../E9-presentation-primitives/index.md#survey-2026-10-24) for when it is elaborated. Headless findings fall to existing work: server-sent progress to [E15](../E15-event-stream/index.md), error envelopes to [E14](../E14-problem-client/index.md), keyboard shortcuts and the command palette to [F12.8](../E12-on-demand-features/index.md#f128--commandregistry), sort state and range selection to [F12.4](../E12-on-demand-features/index.md#f124--client-side-collection-query), loading states to [E6](../E6-asynchronous-resource/index.md).

## Open questions

- **E8 and [F12.10](../E12-on-demand-features/index.md#f1210--rn-forgeng-material) (`ng-material`)** each add a second presentation package. Decide whether both are wanted. Evidence from the 2026-10-24 survey: none of the three applications uses Material; all three use token-driven custom CSS, two with Tailwind. Recommendation: keep E8, and leave F12.10 deferred on its trigger.
