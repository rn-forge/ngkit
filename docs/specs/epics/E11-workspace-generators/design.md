# E11 — Design

Shared design for [E11 — Workspace generators](index.md).

## Design decision

Use one published Nx plugin, `@rn-forge/ng-plugin`, for Angular and `@rn-forge/ng` consumer configuration: configure an Angular app, add ng-bootstrap assets, scaffold rn-forge Angular components and libraries.

Repository-level setup (creating a workspace, its defaults, CI, release workflows and repository-wide lint boundaries) is kiln's, not ngkit's; the retired features and the kiln specs that cover them are on the [epic](index.md).

Do not place Nx generators directly inside the Angular runtime library package. Keep runtime and workspace-mutation tooling separate.

```text
@rn-forge/ng             -> Angular runtime library
@rn-forge/ng-bootstrap   -> Angular Bootstrap/runtime integration library
@rn-forge/ng-plugin      -> Angular-specific Nx generators
```

Rule of thumb:

```text
If the generator requires Angular or rn-forge Angular runtime knowledge, it belongs in @rn-forge/ng-plugin.
If it sets up the repository rather than a project in it, it belongs to kiln.
```

## Package map

| Package                  | Location             | Audience  | Publishes | Purpose                                                      |
| ------------------------ | -------------------- | --------- | --------- | ------------------------------------------------------------ |
| `@rn-forge/ng`           | `libs/ng/`           | consumers | yes       | Angular runtime library                                      |
| `@rn-forge/ng-bootstrap` | `libs/ng-bootstrap/` | consumers | yes       | Bootstrap-based Angular runtime package                      |
| `@rn-forge/ng-plugin`    | `tools/ng-plugin/`   | consumers | yes       | Angular-specific setup, configuration and library generators |

## Release model

Recorded by S11.1.6 (owner decision, 2026-10-17).

`ng-plugin` joins the fixed release group of [ADR-0003](../../../adr/ADR-0003.md) with `ng` and `ng-bootstrap`: one version, one release, tarballs on GitHub Releases, npm disabled.

- It is tagged `publishable` in its `project.json`. It is not added to `nx.json#release.projects`, and it is not named in the build or release commands.
- `dist/` is built once by `release.version.preVersionCommand` (`nx run-many -t build patch-package-exports -p tag:publishable`) and never rebuilt downstream, per [Release pipeline](../../../architecture/release-pipeline.md). `nx release` runs over `tag:publishable`; there is no per-package build order or `--projects` list.
- It follows the [publishable-library guide](../../../guides/development.md#adding-a-publishable-library): package metadata, `release.version.manifestRootsToUpdate` as the fixed pair, `pack`, `verify-dist` and an `nx-release-publish` target with `dryRun: true`.
- `setup` installs `ng` and `ng-bootstrap` at the plugin's own version; any internal dependency is an exact pin on release, never widened by hand, and `workspace:*` never reaches a dist manifest.
- The plugin ships generator template files, which are non-TS assets. When the package is created, check whether its dist `exports` needs `patch-package-exports` (guide item 5).
- Hotfixes to an older major follow the ADR's `release/<major>.x` rule.

Dependency direction:

```text
@rn-forge/ng-plugin          -> knowledge of @rn-forge/ng and @rn-forge/ng-bootstrap (no import)
@rn-forge/ng                 must not depend on the plugin
@rn-forge/ng-bootstrap       must not depend on the plugin
```

### Considered and rejected

- **A second release group for the plugin.** It needs an ADR amending ADR-0003 and a release workflow that handles two groups.
- **An independent plugin version.** Each plugin and library combination would need a compatibility matrix, which ADR-0003 rejects.
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
