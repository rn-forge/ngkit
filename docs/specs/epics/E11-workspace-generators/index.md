# E11 — Workspace generators

**Status:** planned · **Owner:** ngkit

**Source:** former plan item "Workspace Setup Tooling"; owner decisions, 2026-10-17.

Workspace setup tooling is split into focused packages so runtime libraries, Angular-specific generators, and generic Nx workspace generators remain independently maintainable.

[Back to the board](../../index.md)

```text
Scenario A — configure an Angular app in an existing workspace
  pnpm nx g @rn-forge/ng-plugin:setup --project=my-app
  pnpm nx g @rn-forge/ng-plugin:add-bootstrap-table --project=my-app
  pnpm nx g @rn-forge/ng-plugin:configure-theme --project=my-app

Scenario B — scaffold or standardize an existing Nx workspace
  pnpm nx g @rn-forge/nx-plugin:setup-workspace
  pnpm nx g @rn-forge/nx-plugin:create-publishable-lib --name=my-lib --importPath=@acme/my-lib
  pnpm nx g @rn-forge/nx-plugin:setup-boundaries

Scenario C — greenfield Angular workspace
  pnpm dlx create-rn-forge-ng-workspace@latest --name=acme --appName=portal
```

The shared design, package map and implementation standards are in [design.md](design.md).

| Feature                                                                     | Status  | Scope                                                                                                                                                   |
| --------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F11.1 — `@rn-forge/ng-plugin`](F11.1-ng-plugin.md)                         | planned | Angular-specific generators: `setup`, `add-bootstrap-table`, `configure-theme`, `scaffold-component`, `configure-testing`, `create-library`             |
| [F11.2 — `@rn-forge/nx-plugin`](F11.2-nx-plugin.md)                         | planned | Generic Nx generators: `setup-workspace`, `create-publishable-lib`, `setup-ci`, `setup-release`, `setup-boundaries`; `setup-agentic-coding` is deferred |
| [F11.3 — `create-rn-forge-ng-workspace` CLI](F11.3-create-workspace-cli.md) | planned | Greenfield CLI wrapper around `create-nx-workspace` that runs the plugin generators                                                                     |

**Order.** F11.2 first: F11.1's `create-library` composes its `create-publishable-lib`, and F11.3 runs both plugins' `setup` generators.

## Decisions

Recorded by S11.1.6, S11.2.7 and S11.3.2 (owner decision, 2026-10-17). The design pages record each with its rejected options.

- **Release:** the three new packages join the ADR-0003 fixed group, tagged `publishable`, built once, exact pins ([design.md](design.md#release-model)).
- **Ownership:** Angular library scaffolding is `ng-plugin:create-library`; `nx-plugin:create-publishable-lib` is framework-neutral ([F11.1](F11.1-ng-plugin.md#design), [F11.2](F11.2-nx-plugin.md#design)).
- **`setup` wiring:** packages, theme `@use`, `allowedCommonJsDependencies`, `provideRnForgeBootstrapConfig()`; no `scripts`, `polyfills`, `assets` or path-alias patching ([F11.1](F11.1-ng-plugin.md#design)).
- **Release and CI:** `setup-release` writes the fixed model; GitHub only in v1 ([F11.2](F11.2-nx-plugin.md#design)).
- **Deferred:** `setup-agentic-coding` (S11.2.6).
- **CLI:** matched exact versions; warns outside the tested pnpm range; Corepack pins `packageManager` ([F11.3](F11.3-create-workspace-cli.md#design)).

## Open questions

One, on [F11.1](F11.1-ng-plugin.md#open-questions): whether `setup` must add the `@angular/localize/init` polyfill.

## Acceptance

E11 is done when every feature's acceptance block passes and the packages release with the group.

```bash
set -euo pipefail
pnpm exec nx run-many -t test build -p ng-plugin nx-plugin create-workspace
for p in ng-plugin nx-plugin create-workspace; do
  test "$(pnpm exec nx show project "$p" --json | jq -r '.tags | index("publishable") != null')" = true
done
```
