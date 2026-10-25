# E11 — Workspace generators

**Status:** planned · **Owner:** ngkit · **Release:** [Release 3](../../../releases/release-3/index.md)

**Source:** former plan item "Workspace Setup Tooling"; owner decisions, 2026-10-17.

**Retired:** F11.2 (`@rn-forge/nx-plugin`) and F11.3 (`create-rn-forge-ng-workspace` CLI), owner decision, 2026-10-17. Both created or standardized the repository itself, and [kiln](https://github.com/rn-forge/kiln) now owns that work ([ADR-0007](../../../adr/ADR-0007.md)): `kiln new` creates the repository and `kiln apply` keeps it in line, including its pnpm/Nx workspace (kiln ADR-0005). kiln's `node-lib` archetype renders ngkit's CI, release workflow and fixed-group `v<version>` release (kiln E9, F9.1, ADR-0015). A second generator writing the same files would compete with kiln for them.

`@rn-forge/ng-plugin` configures an Angular app in an existing workspace to use ngkit's libraries. kiln knows nothing about those libraries, so that wiring stays here. The plugin is kept separate from the runtime libraries, so the libraries and the generators stay independently maintainable.

[Back to the board](../../index.md)

```text
Configure an Angular app in an existing workspace
  pnpm nx g @rn-forge/ng-plugin:setup --project=my-app
  pnpm nx g @rn-forge/ng-plugin:add-bootstrap-table --project=my-app
  pnpm nx g @rn-forge/ng-plugin:configure-theme --project=my-app
```

The shared design, package map and implementation standards are in [design.md](design.md).

| Feature                                             | Status  | Scope                                                                                                                                       |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [F11.1 — `@rn-forge/ng-plugin`](F11.1-ng-plugin.md) | planned | Angular-specific generators: `setup`, `add-bootstrap-table`, `configure-theme`, `scaffold-component`, `configure-testing`, `create-library` |

## Decisions

Recorded by S11.1.6 (owner decision, 2026-10-17). The design pages record each with its rejected options.

- **Release:** `@rn-forge/ng-plugin` joins the ADR-0003 fixed group, tagged `publishable`, built once, exact pins ([design.md](design.md#release-model)).
- **Ownership:** repository-level setup belongs to kiln (see **Retired** above). Angular library scaffolding is `ng-plugin:create-library`, which writes the project's own publishable settings ([F11.1](F11.1-ng-plugin.md#design)).
- **`setup` wiring:** packages, theme `@use`, `allowedCommonJsDependencies`, `provideRnForgeBootstrapConfig()`; no `scripts`, `polyfills`, `assets` or path-alias patching ([F11.1](F11.1-ng-plugin.md#design)).

## Open questions

One, on [F11.1](F11.1-ng-plugin.md#open-questions): whether `setup` must add the `@angular/localize/init` polyfill.

## Acceptance

E11 is done when F11.1's acceptance block passes and the package releases with the group.

```bash
set -euo pipefail
pnpm exec nx run-many -t test build -p ng-plugin
test "$(pnpm exec nx show project ng-plugin --json | jq -r '.tags | index("publishable") != null')" = true
```
