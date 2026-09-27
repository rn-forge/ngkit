# E11 — Design

Shared design for [E11 — Workspace generators](index.md).

## Design decision

Use two published Nx plugins:

| Plugin                | Responsibility                                    | Examples                                                                                |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `@rn-forge/ng-plugin` | Angular and `@rn-forge/ng` consumer configuration | configure an Angular app, add ng-bootstrap assets, scaffold rn-forge Angular components |
| `@rn-forge/nx-plugin` | Generic Nx workspace and repo scaffolding         | workspace defaults, CI, release, tags, project boundaries, library scaffolding          |

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

| Package                        | Location                                    | Audience  | Publishes | Purpose                                         |
| ------------------------------ | ------------------------------------------- | --------- | --------- | ----------------------------------------------- |
| `@rn-forge/ng`                 | `libs/ng/`                                  | consumers | yes       | Angular runtime library                         |
| `@rn-forge/ng-bootstrap`       | `libs/ng-bootstrap/`                        | consumers | yes       | Bootstrap-based Angular runtime package         |
| `@rn-forge/ng-plugin`          | `tools/ng-plugin/` or `packages/ng-plugin/` | consumers | yes       | Angular-specific setup/configuration generators |
| `@rn-forge/nx-plugin`          | `tools/nx-plugin/` or `packages/nx-plugin/` | consumers | yes       | Nx workspace/repo scaffolding generators        |
| `create-rn-forge-ng-workspace` | `tools/create-workspace/`                   | consumers | yes       | Greenfield CLI wrapper                          |

## Build & publish order

```text
1. pnpm nx build ng
2. pnpm nx build ng-bootstrap
3. pnpm nx build ng-plugin
4. pnpm nx build nx-plugin
5. pnpm nx build create-workspace
6. pnpm nx release --projects=ng,ng-bootstrap,ng-plugin,nx-plugin,create-workspace
```

Release dependency direction:

```text
@rn-forge/ng-plugin      depends on @rn-forge/ng and @rn-forge/ng-bootstrap knowledge
create-rn-forge-ng-workspace depends on @rn-forge/ng-plugin and @rn-forge/nx-plugin
@rn-forge/nx-plugin      should not depend on @rn-forge/ng-plugin
@rn-forge/ng             should not depend on either plugin
```

## Shared implementation standards

### Idempotency

Every generator must be safe to run more than once.

Required helpers:

```text
ensureArrayValue()
ensureOrderedScripts()
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

Prefer managed marker regions for generated text blocks:

```scss
/* rn-forge:start */
@use '@rn-forge/ng-bootstrap/styles' as *;
/* rn-forge:end */
```

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
