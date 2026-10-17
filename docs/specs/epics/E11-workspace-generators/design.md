# E11 — Design

Shared design for [E11 — Workspace generators](index.md).

## Design decision

Use two published Nx plugins:

| Plugin                | Responsibility                                    | Examples                                                                                |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `@rn-forge/ng-plugin` | Angular and `@rn-forge/ng` consumer configuration | configure an Angular app, add ng-bootstrap assets, scaffold rn-forge Angular components |
| `@rn-forge/nx-plugin` | Generic Nx workspace and repo scaffolding         | workspace defaults, CI, release, tags, project boundaries, library scaffolding          |

Recorded by S11.1.6 (owner decision, 2026-10-17): Angular library scaffolding belongs to `ng-plugin` (`create-library`); `nx-plugin`'s `create-publishable-lib` is framework-neutral.

Do not place Nx generators directly inside the Angular runtime library package. Keep runtime and workspace-mutation tooling separate.

```text
@rn-forge/ng             -> Angular runtime library
@rn-forge/ng-bootstrap   -> Angular Bootstrap/runtime integration library
@rn-forge/ng-plugin      -> Angular-specific Nx generators
@rn-forge/nx-plugin      -> generic Nx workspace/repo generators
create-rn-forge-ng-workspace -> greenfield CLI wrapper
```

Rule of thumb:

```text
If the generator requires Angular or rn-forge Angular runtime knowledge, use @rn-forge/ng-plugin.
If the generator applies repo conventions or works across project types, use @rn-forge/nx-plugin.
```

## Package map

| Package                        | Location                  | Audience  | Publishes | Purpose                                                      |
| ------------------------------ | ------------------------- | --------- | --------- | ------------------------------------------------------------ |
| `@rn-forge/ng`                 | `libs/ng/`                | consumers | yes       | Angular runtime library                                      |
| `@rn-forge/ng-bootstrap`       | `libs/ng-bootstrap/`      | consumers | yes       | Bootstrap-based Angular runtime package                      |
| `@rn-forge/ng-plugin`          | `tools/ng-plugin/`        | consumers | yes       | Angular-specific setup, configuration and library generators |
| `@rn-forge/nx-plugin`          | `tools/nx-plugin/`        | consumers | yes       | Nx workspace/repo scaffolding generators                     |
| `create-rn-forge-ng-workspace` | `tools/create-workspace/` | consumers | yes       | Greenfield CLI wrapper                                       |

## Release model

Recorded by S11.2.7 and S11.3.2 (owner decision, 2026-10-17).

`ng-plugin`, `nx-plugin` and `create-workspace` join the fixed release group of [ADR-0003](../../../adr/ADR-0003.md) with `ng` and `ng-bootstrap`: one version, one release, tarballs on GitHub Releases, npm disabled.

- Each is tagged `publishable` in its `project.json`. None is added to `nx.json#release.projects`, and none is named in the build or release commands.
- `dist/` is built once by `release.version.preVersionCommand` (`nx run-many -t build patch-package-exports -p tag:publishable`) and never rebuilt downstream, per [Release pipeline](../../../architecture/release-pipeline.md). `nx release` runs over `tag:publishable`; there is no per-package build order or `--projects` list.
- Each follows the [publishable-library guide](../../../guides/development.md#adding-a-publishable-library): package metadata, `release.version.manifestRootsToUpdate` as the fixed pair, `pack`, `verify-dist` and an `nx-release-publish` target with `dryRun: true`.
- Dependencies between the five are exact pins on release (the CLI on both plugins, `ng-plugin` on `nx-plugin`); a pin is never widened by hand and `workspace:*` never reaches a dist manifest.
- The plugins ship generator template files, which are non-TS assets. When a package is created, check whether its dist `exports` needs `patch-package-exports` (guide item 5).
- Hotfixes to an older major follow the ADR's `release/<major>.x` rule.

Dependency direction:

```text
create-rn-forge-ng-workspace -> @rn-forge/ng-plugin, @rn-forge/nx-plugin
@rn-forge/ng-plugin          -> @rn-forge/nx-plugin   (create-library composes create-publishable-lib)
@rn-forge/ng-plugin          -> knowledge of @rn-forge/ng and @rn-forge/ng-bootstrap (no import)
@rn-forge/nx-plugin          must not depend on @rn-forge/ng-plugin
@rn-forge/ng                 must not depend on either plugin
```

### Considered and rejected

- **A second release group for the plugins.** It needs an ADR amending ADR-0003 and a release workflow that handles two groups.
- **Independent plugin versions.** Each CLI, `nx-plugin` and `ng-plugin` combination would need a compatibility matrix, which ADR-0003 rejects.
- **A per-package build order with `nx release --projects=…`.** It contradicts the single `preVersionCommand` build and the `publishable` tag.

## Shared implementation standards

### Idempotency

Every generator must be safe to run more than once.

Required helpers:

```text
ensureArrayValue()
ensureJsonPath()
ensureManagedBlock()
ensurePackageDependency()
readAngularBuildTarget()
assertAngularApplication()
```

### Project detection

Generators must use Nx project graph/config APIs where possible:

```text
readProjectConfiguration(tree, projectName)
updateProjectConfiguration(tree, projectName, projectConfig)
getProjects(tree)
```

Avoid hardcoding `apps/` and `libs/` paths except as fallback behavior.

### File patching

Prefer managed marker regions for generated text blocks. A generator also detects an existing import of the same module outside the markers and leaves the file unchanged:

```scss
/* rn-forge:start */
@use '@rn-forge/ng-bootstrap/assets/theme';
/* rn-forge:end */
```

### Acceptance

Generator behavior is checked inside this repository: each generator's spec runs in a temporary Nx workspace tree, and each feature has a `## Acceptance` block that runs those specs and checks the package's release settings.

### Testing

Each generator should have tests for:

```text
- happy path
- idempotency
- missing project validation
- wrong project type validation
- skipInstall behavior when dependencies are patched
- preservation of unrelated existing config
```
