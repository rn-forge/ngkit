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

## Open questions

- E8 and [F12.10](../E12-on-demand-features/index.md#f1210--rn-forgeng-material) (`ng-material`) each add a second presentation package. Decide whether both are wanted.
