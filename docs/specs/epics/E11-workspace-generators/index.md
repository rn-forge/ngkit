# E11 — Workspace generators

**Status:** elaborating · **Owner:** ngkit

**Source:** former plan item "Workspace Setup Tooling".

Workspace setup tooling is split into focused packages so runtime libraries, Angular-specific generators, and generic Nx workspace generators remain independently maintainable.

[Back to the board](../../index.md)

```text
Scenario A — configure an Angular app in an existing workspace
  pnpm nx g @rn-forge/ng-plugin:setup --project=my-app
  pnpm nx g @rn-forge/ng-plugin:add-bootstrap-table --project=my-app
  pnpm nx g @rn-forge/ng-plugin:configure-theme --project=my-app

Scenario B — scaffold or standardize an existing Nx workspace
  pnpm nx g @rn-forge/nx-plugin:setup-workspace
  pnpm nx g @rn-forge/nx-plugin:create-publishable-lib --name=my-ui --importPath=@acme/my-ui
  pnpm nx g @rn-forge/nx-plugin:setup-boundaries

Scenario C — greenfield Angular workspace
  pnpm dlx create-rn-forge-ng-workspace@latest --name=acme --appName=portal
```

The shared design, package map and implementation standards are in [design.md](design.md).

| Feature                                                                     | Status      | Scope                                                                                                                                       |
| --------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [F11.1 — `@rn-forge/ng-plugin`](F11.1-ng-plugin.md)                         | elaborating | Angular-specific generators: `setup`, `add-bootstrap-table`, `configure-theme`, `scaffold-component`, `configure-testing`                   |
| [F11.2 — `@rn-forge/nx-plugin`](F11.2-nx-plugin.md)                         | elaborating | Generic Nx generators: `setup-workspace`, `create-publishable-lib`, `setup-ci`, `setup-release`, `setup-boundaries`, `setup-agentic-coding` |
| [F11.3 — `create-rn-forge-ng-workspace` CLI](F11.3-create-workspace-cli.md) | elaborating | Greenfield CLI wrapper around `create-nx-workspace` that runs the plugin generators                                                         |

## Open questions

1. **Published package path aliases** — validate whether consumer workspaces need `tsconfig.base.json` aliases for published `@rn-forge/ng` packages. Default should be no aliases unless local-linking requires them.
2. **Generator ownership for Angular library scaffolding** — decide whether `create-publishable-lib --framework=angular` should remain in `nx-plugin` or move to `ng-plugin` as `create-library`.
3. **Bootstrap Table support scope** — define the exact initial script/style/extension list before implementing `add-bootstrap-table`.
4. **Storybook and Compodoc** — decide whether these are flags on `create-publishable-lib` or separate generators.
5. **pnpm v10/v11 compatibility** — CLI should detect pnpm version and either warn or select compatible workspace creation flow.
6. **CI provider scope** — implement GitHub first, or include Azure DevOps templates from day one.
7. **Agentic coding scope** — decide whether this belongs in `@rn-forge/nx-plugin` v1 or a later `@rn-forge/devfoundry` package.
8. `ng-plugin:setup` steps 4 and 6 add polyfills, scripts and assets to the build target, but `provideRnForgeBootstrapConfig()` now loads all vendor scripts at runtime and `ng-bootstrap` needs no `scripts`/`polyfills` entries (`libs/ng-bootstrap/README.md`). What does `setup` still need to patch?
9. The file-patching example uses `@rn-forge/ng-bootstrap/styles`; the real entry is `@rn-forge/ng-bootstrap/assets/theme`.
10. `libs/ng-bootstrap/README.md` promises a generator will add `allowedCommonJsDependencies`; no generator in this epic does.
11. The build and publish order runs `nx release --projects=…` over five packages, while [ADR-0003](../../../adr/ADR-0003.md) releases `ng` and `ng-bootstrap` as one fixed group, as tarballs. How do the plugins version and ship?
