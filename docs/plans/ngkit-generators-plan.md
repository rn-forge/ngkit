# Feature: Workspace Setup Tooling

## Overview

Workspace setup tooling is split into focused packages so runtime libraries, Angular-specific generators, and generic Nx workspace generators remain independently maintainable.

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

---

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

---

## Package map

| Package                        | Location                                    | Audience     | Publishes | Purpose                                                                            |
| ------------------------------ | ------------------------------------------- | ------------ | --------- | ---------------------------------------------------------------------------------- |
| `@rn-forge/ng`                 | `libs/ng/`                                  | consumers    | yes       | Angular runtime library                                                            |
| `@rn-forge/ng-bootstrap`       | `libs/ng-bootstrap/`                        | consumers    | yes       | Bootstrap-based Angular runtime package                                            |
| `@rn-forge/ng-plugin`          | `tools/ng-plugin/` or `packages/ng-plugin/` | consumers    | yes       | Angular-specific setup/configuration generators                                    |
| `@rn-forge/nx-plugin`          | `tools/nx-plugin/` or `packages/nx-plugin/` | consumers    | yes       | Nx workspace/repo scaffolding generators                                           |
| `create-rn-forge-ng-workspace` | `tools/create-workspace/`                   | consumers    | yes       | Greenfield CLI wrapper                                                             |
| `@rn-forge/ng-bootstrap-tools` | `tools/ng-bootstrap/`                       | in-repo only | no        | Legacy/internal setup-assets tooling, pending replacement by `@rn-forge/ng-plugin` |

---

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

---

## Deliverable 1 — `@rn-forge/ng-plugin`

Published Nx plugin for Angular-specific rn-forge setup and component/configuration generators.

### Location

```text
tools/ng-plugin/
  src/generators/
    setup/
      schema.json
      schema.d.ts
      generator.ts
      generator.spec.ts
    add-bootstrap-table/
      schema.json
      schema.d.ts
      generator.ts
      generator.spec.ts
    configure-theme/
      schema.json
      schema.d.ts
      generator.ts
      generator.spec.ts
    scaffold-component/
      schema.json
      schema.d.ts
      generator.ts
      generator.spec.ts
    configure-testing/
      schema.json
      schema.d.ts
      generator.ts
      generator.spec.ts
  generators.json
  package.json              -> @rn-forge/ng-plugin
  tsconfig.json
  project.json
```

Built with `@nx/js:tsc`. Prefer `module: node16` / `moduleResolution: node16` unless the repo standard changes.

### Generator grouping

| Generator              | Purpose                                                           | Initial priority |
| ---------------------- | ----------------------------------------------------------------- | ---------------- |
| `:setup`               | Configure an Angular app to consume rn-forge Angular libraries    | P0               |
| `:add-bootstrap-table` | Wire Bootstrap Table assets/scripts and optionally scaffold usage | P0/P1            |
| `:configure-theme`     | Apply rn-forge Bootstrap/theme styling conventions                | P1               |
| `:scaffold-component`  | Create opinionated Angular components using rn-forge conventions  | P1               |
| `:configure-testing`   | Add/patch Vitest Angular test setup for rn-forge libraries/apps   | P2               |

---

### Generator: `@rn-forge/ng-plugin:setup`

Configures an existing Angular app to consume `@rn-forge/ng` and `@rn-forge/ng-bootstrap`.

This replaces the old `@rn-forge/nx:app` generator. It belongs in `ng-plugin` because it understands Angular app structure and rn-forge Angular runtime packages.

#### Usage

```bash
pnpm nx g @rn-forge/ng-plugin:setup --project=my-app
```

#### Schema

| Option                  | Type    | Required | Default | Description                                      |
| ----------------------- | ------- | -------- | ------- | ------------------------------------------------ |
| `project`               | string  | yes      | —       | Angular app project to configure                 |
| `packageManager`        | enum    | no       | `pnpm`  | `pnpm \| npm \| yarn`                            |
| `skipInstall`           | boolean | no       | `false` | Skip dependency installation                     |
| `skipStyles`            | boolean | no       | `false` | Skip app stylesheet injection                    |
| `skipAssets`            | boolean | no       | `false` | Skip project asset/polyfill/script wiring        |
| `includeBootstrapTable` | boolean | no       | `true`  | Include Bootstrap Table wiring during setup      |
| `includeTheme`          | boolean | no       | `true`  | Include rn-forge theme/style wiring during setup |

#### Steps

1. Validate that `project` exists and is an Angular application.
2. Add runtime dependencies: `@rn-forge/ng`, `@rn-forge/ng-bootstrap`, and required peers.
3. Patch `tsconfig.base.json` only if path aliases are confirmed necessary.
4. Patch the app build target:
   - add required polyfills
   - add rn-forge asset entries
   - add styles
   - add required scripts in deterministic order
5. Inject the Bootstrap/rn-forge `@use` block into the app stylesheet if not already present.
6. Delegate Bootstrap Table-specific wiring to the same internal helper used by `:add-bootstrap-table`.
7. Format files.
8. Run package installation unless `skipInstall` is true.

#### Requirement discussion

Before implementation, confirm:

| Topic                  | Decision needed                                                            | Default proposal                                            |
| ---------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Path aliases           | Should published packages require `tsconfig.base.json` aliases?            | Avoid aliases unless local workspace linking requires them  |
| Asset strategy         | Should assets be referenced from `node_modules` or copied into app assets? | Reference from `node_modules` through build options         |
| Script order           | Which scripts are mandatory and in what order?                             | Centralize order in one helper and test it                  |
| Build target detection | Support only Angular application executors or also custom executors?       | Start with standard Nx Angular executors only               |
| Stylesheet location    | How to detect app stylesheet path reliably?                                | Read build target `styles[]`; fallback to `src/styles.scss` |
| SSR                    | Should setup handle SSR/server targets?                                    | Do not support initially; detect and warn only              |
| Standalone app config  | Should providers be injected into `app.config.ts`?                         | Defer unless runtime package requires providers             |

#### Acceptance criteria

```gherkin
Feature: ng-plugin:setup generator

  Background:
    Given an Nx Angular workspace
    And an Angular app "my-app" exists

  Scenario: full setup
    When I run "pnpm nx g @rn-forge/ng-plugin:setup --project=my-app"
    Then package.json contains @rn-forge/ng and @rn-forge/ng-bootstrap
    And the Angular app build target contains required rn-forge assets, styles, polyfills, and scripts
    And the app stylesheet contains the rn-forge Bootstrap @use block
    And "pnpm nx serve my-app" starts without errors

  Scenario: idempotent
    Given ng-plugin:setup has already been run on "my-app"
    When I run the generator again
    Then no files are changed

  Scenario: non-Angular project rejected
    When I run "pnpm nx g @rn-forge/ng-plugin:setup --project=my-lib"
    Then the generator exits with an error containing "Angular application"

  Scenario: skipInstall
    When I run "pnpm nx g @rn-forge/ng-plugin:setup --project=my-app --skipInstall"
    Then package.json is updated but install is not executed

  Scenario: skipStyles
    When I run "pnpm nx g @rn-forge/ng-plugin:setup --project=my-app --skipStyles"
    Then the app stylesheet is not modified
```

---

### Generator: `@rn-forge/ng-plugin:add-bootstrap-table`

Adds Bootstrap Table support to an Angular app already using, or about to use, `@rn-forge/ng-bootstrap`.

This replaces the legacy internal `setup-assets` flow over time.

#### Usage

```bash
pnpm nx g @rn-forge/ng-plugin:add-bootstrap-table --project=my-app
```

#### Schema

| Option              | Type    | Required | Default | Description                                            |
| ------------------- | ------- | -------- | ------- | ------------------------------------------------------ |
| `project`           | string  | yes      | —       | Angular app project to configure                       |
| `skipInstall`       | boolean | no       | `false` | Skip dependency installation                           |
| `includeExtensions` | string  | no       | —       | Comma-separated Bootstrap Table extensions to wire     |
| `scaffoldExample`   | boolean | no       | `false` | Create an example component/page using Bootstrap Table |
| `skipScripts`       | boolean | no       | `false` | Skip script injection                                  |
| `skipStyles`        | boolean | no       | `false` | Skip style injection                                   |

#### Steps

1. Validate Angular application project.
2. Add required dependencies and peer dependencies.
3. Add scripts to the app build target in deterministic order:
   - jQuery
   - Bootstrap bundle if required
   - Bootstrap Table core
   - selected Bootstrap Table extensions
4. Add required styles to the app build target.
5. Add required assets to the app build target.
6. Optionally scaffold an example component/page.
7. Format files.
8. Install packages unless skipped.

#### Requirement discussion

Before implementation, confirm:

| Topic              | Decision needed                                                             | Default proposal                                                 |
| ------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Extension list     | Which Bootstrap Table extensions are supported first?                       | Start with the exact extensions currently used by `ng-bootstrap` |
| jQuery ownership   | Should jQuery be installed by app setup or this generator?                  | This generator owns it when Bootstrap Table is selected          |
| Script duplication | How to avoid duplicate script entries across `:setup` and this generator?   | Shared `ensureOrderedScripts()` helper                           |
| Example scaffold   | Should generated examples go under app routes or standalone component only? | Standalone component only initially                              |
| Failure mode       | What if app uses Vite/custom builder with no `scripts[]` support?           | Reject with actionable error initially                           |

#### Acceptance criteria

```gherkin
Feature: ng-plugin:add-bootstrap-table generator

  Background:
    Given an Nx Angular workspace
    And an Angular app "my-app" exists

  Scenario: adds Bootstrap Table wiring
    When I run "pnpm nx g @rn-forge/ng-plugin:add-bootstrap-table --project=my-app"
    Then package.json contains Bootstrap Table dependencies
    And project.json scripts contain jQuery before Bootstrap Table
    And project.json styles contain Bootstrap Table styles

  Scenario: idempotent
    Given the generator has already been run
    When I run it again
    Then no files are changed

  Scenario: scaffold example
    When I run "pnpm nx g @rn-forge/ng-plugin:add-bootstrap-table --project=my-app --scaffoldExample"
    Then an example standalone component is created
```

---

### Generator: `@rn-forge/ng-plugin:configure-theme`

Applies rn-forge Bootstrap/theme styling conventions to an Angular application.

#### Usage

```bash
pnpm nx g @rn-forge/ng-plugin:configure-theme --project=my-app
```

#### Schema

| Option       | Type    | Required | Default     | Description                           |
| ------------ | ------- | -------- | ----------- | ------------------------------------- |
| `project`    | string  | yes      | —           | Angular app project to configure      |
| `theme`      | enum    | no       | `default`   | Theme preset name                     |
| `stylesheet` | string  | no       | auto-detect | Explicit stylesheet path to patch     |
| `force`      | boolean | no       | `false`     | Replace existing rn-forge theme block |

#### Steps

1. Detect app stylesheet.
2. Add rn-forge theme imports or `@use` block.
3. Add any required style assets to the build target.
4. Preserve existing app styles.
5. Format files.

#### Requirement discussion

Before implementation, confirm:

| Topic                   | Decision needed                                        | Default proposal                                   |
| ----------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Theme presets           | Which presets are shipped in v1?                       | `default` only                                     |
| Patch method            | Prepend block, append block, or managed marker region? | Managed marker region                              |
| SCSS only               | Should CSS/Less be supported?                          | SCSS only initially                                |
| Consumer override model | How should apps override Bootstrap variables?          | Generate a local `_rn-forge-theme.scss` file later |

#### Acceptance criteria

```gherkin
Feature: ng-plugin:configure-theme generator

  Scenario: configure default theme
    When I run "pnpm nx g @rn-forge/ng-plugin:configure-theme --project=my-app"
    Then the app stylesheet contains the managed rn-forge theme block

  Scenario: idempotent
    Given the theme block already exists
    When I run the generator again
    Then the theme block is not duplicated
```

---

### Generator: `@rn-forge/ng-plugin:scaffold-component`

Creates an opinionated Angular standalone component using rn-forge conventions.

#### Usage

```bash
pnpm nx g @rn-forge/ng-plugin:scaffold-component --project=my-app --name=customer-grid
```

#### Schema

| Option      | Type    | Required | Default     | Description                                              |
| ----------- | ------- | -------- | ----------- | -------------------------------------------------------- |
| `project`   | string  | yes      | —           | Target Angular app or library                            |
| `name`      | string  | yes      | —           | Component name                                           |
| `directory` | string  | no       | auto        | Directory relative to project source root                |
| `type`      | enum    | no       | `component` | `component \| page \| table \| form`                     |
| `export`    | boolean | no       | `false`     | Export from library public API when project is a library |
| `withStory` | boolean | no       | `false`     | Generate a Storybook story if Storybook exists           |
| `withTest`  | boolean | no       | `true`      | Generate Vitest spec                                     |

#### Steps

1. Validate target project is Angular app or library.
2. Generate a standalone Angular component.
3. Apply rn-forge naming, prefix, SCSS, and testing conventions.
4. Add optional story/test files.
5. Update library public API when requested.
6. Format files.

#### Requirement discussion

Before implementation, confirm:

| Topic               | Decision needed                                   | Default proposal                                |
| ------------------- | ------------------------------------------------- | ----------------------------------------------- |
| Component templates | Which component types are worth standardizing?    | `component`, `page`, `table`, `form`            |
| Routing             | Should `page` type update routes?                 | No initially; generate component only           |
| Public API export   | Should app projects reject `--export`?            | Yes                                             |
| Storybook           | Should story generation fail if Storybook absent? | No; warn and skip                               |
| Prefix              | Should prefix be fixed to `rnf`?                  | Use workspace/project prefix, fallback to `rnf` |

#### Acceptance criteria

```gherkin
Feature: ng-plugin:scaffold-component generator

  Scenario: scaffold standalone component
    When I run "pnpm nx g @rn-forge/ng-plugin:scaffold-component --project=my-app --name=customer-grid"
    Then a standalone Angular component is created using rn-forge conventions
    And a Vitest spec is created

  Scenario: export from library
    When I run "pnpm nx g @rn-forge/ng-plugin:scaffold-component --project=my-lib --name=customer-grid --export"
    Then the component is exported from the library public API
```

---

### Generator: `@rn-forge/ng-plugin:configure-testing`

Patches Angular app/library testing configuration for rn-forge defaults.

#### Usage

```bash
pnpm nx g @rn-forge/ng-plugin:configure-testing --project=my-lib --coverageThreshold=80
```

#### Schema

| Option              | Type    | Required | Default          | Description                               |
| ------------------- | ------- | -------- | ---------------- | ----------------------------------------- |
| `project`           | string  | yes      | —                | Angular app or library project            |
| `coverageThreshold` | number  | no       | `35`             | Vitest coverage threshold for all metrics |
| `reporters`         | string  | no       | `text,html,json` | Coverage reporters                        |
| `skipInstall`       | boolean | no       | `false`          | Skip dependency installation              |

#### Steps

1. Validate Angular project.
2. Ensure Vitest/Vitest Angular dependencies exist.
3. Patch project test target.
4. Patch `tsconfig.spec.json` includes/excludes.
5. Add coverage thresholds.
6. Format files.

#### Requirement discussion

Before implementation, confirm:

| Topic                   | Decision needed                       | Default proposal                                                                    |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| App vs library defaults | Should thresholds differ?             | Same initially                                                                      |
| Coverage target         | Is `35` still the starting threshold? | Keep old default until revised                                                      |
| Runner support          | Vitest Angular only or Jest too?      | Vitest Angular only                                                                 |
| CI output               | Should JSON path be standardized?     | Yes, use `.agents/out/coverage.<project>.json` later if aligned with repo standards |

#### Acceptance criteria

```gherkin
Feature: ng-plugin:configure-testing generator

  Scenario: configure coverage threshold
    When I run "pnpm nx g @rn-forge/ng-plugin:configure-testing --project=my-lib --coverageThreshold=80"
    Then the project test target has 80% coverage thresholds for all metrics
```

---

## Deliverable 2 — `@rn-forge/nx-plugin`

Published Nx plugin for generic workspace, repo, and project scaffolding. It should not contain Angular runtime-specific setup.

### Location

```text
tools/nx-plugin/
  src/generators/
    setup-workspace/
      schema.json
      schema.d.ts
      generator.ts
      generator.spec.ts
    create-publishable-lib/
      schema.json
      schema.d.ts
      generator.ts
      generator.spec.ts
    setup-ci/
      schema.json
      schema.d.ts
      generator.ts
      generator.spec.ts
    setup-release/
      schema.json
      schema.d.ts
      generator.ts
      generator.spec.ts
    setup-boundaries/
      schema.json
      schema.d.ts
      generator.ts
      generator.spec.ts
    setup-agentic-coding/
      schema.json
      schema.d.ts
      generator.ts
      generator.spec.ts
  generators.json
  package.json              -> @rn-forge/nx-plugin
  tsconfig.json
  project.json
```

### Generator grouping

| Generator                 | Purpose                                                       | Initial priority |
| ------------------------- | ------------------------------------------------------------- | ---------------- |
| `:setup-workspace`        | Apply baseline Nx workspace conventions                       | P0               |
| `:create-publishable-lib` | Scaffold publishable libraries with rn-forge repo conventions | P0/P1            |
| `:setup-ci`               | Configure GitHub Actions / CI defaults                        | P1               |
| `:setup-release`          | Configure Nx release defaults                                 | P1               |
| `:setup-boundaries`       | Configure tags, module boundaries, lint rules                 | P1               |
| `:setup-agentic-coding`   | Add AI-agent instructions, prompts, and guardrails            | P2               |

---

### Generator: `@rn-forge/nx-plugin:setup-workspace`

Configures an existing Nx workspace with rn-forge repo-level standards.

This replaces the old `@rn-forge/nx:workspace` generator.

#### Usage

```bash
pnpm nx g @rn-forge/nx-plugin:setup-workspace
```

#### Schema

| Option                   | Type    | Required | Default | Description                                    |
| ------------------------ | ------- | -------- | ------- | ---------------------------------------------- |
| `packageManager`         | enum    | no       | `pnpm`  | `pnpm \| npm \| yarn`                          |
| `skipInstall`            | boolean | no       | `false` | Skip dependency installation                   |
| `configureTsConfig`      | boolean | no       | `true`  | Patch root TypeScript defaults                 |
| `configureWorkspaceFile` | boolean | no       | `true`  | Ensure workspace package manager config exists |

#### Steps

1. Install repo-level dev dependencies.
2. Patch `tsconfig.base.json`:
   - `target: ES2022`
   - `lib: [ES2022, DOM]`
   - `module: esnext`
   - `moduleResolution: bundler`
3. Add `pnpm-workspace.yaml` from template if missing and package manager is `pnpm`.
4. Add or patch root formatting/linting baseline.
5. Format files.
6. Install packages unless skipped.

#### Requirement discussion

Before implementation, confirm:

| Topic                    | Decision needed                                  | Default proposal                                                              |
| ------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Angular-specific aliases | Should this generator add `@rn-forge/ng` paths?  | No; move to `ng-plugin` only if proven necessary                              |
| Package managers         | Support all managers or pnpm-only?               | Keep schema open, implement pnpm first                                        |
| Storybook plugin         | Should Storybook be installed here?              | No; make it opt-in through specific generator later                           |
| Existing tsconfig        | Should generator overwrite or merge?             | Merge only, preserve existing explicit settings unless `force` is added later |
| Workspace type           | Support package-based and integrated workspaces? | Yes, but validate behavior separately                                         |

#### Acceptance criteria

```gherkin
Feature: nx-plugin:setup-workspace generator

  Background:
    Given a fresh Nx workspace exists

  Scenario: full setup
    When I run "pnpm nx g @rn-forge/nx-plugin:setup-workspace"
    Then package.json contains rn-forge repo-level dev dependencies
    And tsconfig.base.json target is ES2022 and moduleResolution is bundler
    And pnpm-workspace.yaml exists when packageManager is pnpm

  Scenario: idempotent
    Given nx-plugin:setup-workspace has already been run
    When I run the generator again
    Then no files are changed

  Scenario: skipInstall
    When I run "pnpm nx g @rn-forge/nx-plugin:setup-workspace --skipInstall"
    Then package.json is updated but install is not executed
```

---

### Generator: `@rn-forge/nx-plugin:create-publishable-lib`

Scaffolds a publishable library using rn-forge conventions. This is generic enough to live in `nx-plugin`, but Angular-specific library behavior should be delegated to Nx Angular generators and kept minimal here.

This replaces the old `@rn-forge/nx:library` generator name.

#### Usage

```bash
pnpm nx g @rn-forge/nx-plugin:create-publishable-lib --name=my-ui --importPath=@acme/my-ui --framework=angular
```

#### Schema

| Option                 | Type    | Required | Default   | Description                       |
| ---------------------- | ------- | -------- | --------- | --------------------------------- |
| `name`                 | string  | yes      | —         | Library project name              |
| `importPath`           | string  | yes      | —         | npm package name                  |
| `framework`            | enum    | no       | `angular` | `angular \| js` initially         |
| `directory`            | string  | no       | `libs/`   | Library directory                 |
| `secondaryEntryPoints` | string  | no       | —         | Comma-separated entry point names |
| `publishable`          | boolean | no       | `true`    | Configure package for publishing  |
| `storybook`            | boolean | no       | `false`   | Add Storybook when supported      |
| `compodoc`             | boolean | no       | `false`   | Add Compodoc when supported       |
| `coverageThreshold`    | number  | no       | `35`      | Coverage threshold                |
| `packageManager`       | enum    | no       | `pnpm`    | `pnpm \| npm \| yarn`             |
| `skipInstall`          | boolean | no       | `false`   | Skip dependency installation      |

#### Steps

For `framework=angular`:

1. Run `@nx/angular:library` with publishable, standalone, strict, SCSS, and Vitest Angular options.
2. Scaffold secondary entry points if requested.
3. Apply repo-level library defaults:
   - eslint baseline
   - Vitest target configuration
   - `tsconfig.spec.json` include/exclude updates
   - remove placeholder files when desired
4. Optionally run Storybook configuration.
5. Optionally run Compodoc configuration.
6. Format files.
7. Install packages unless skipped.

#### Requirement discussion

Before implementation, confirm:

| Topic                    | Decision needed                                                  | Default proposal                                                           |
| ------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Ownership vs `ng-plugin` | Should Angular publishable library creation move to `ng-plugin`? | Keep generic scaffolding here; Angular runtime wiring stays in `ng-plugin` |
| Framework support        | Angular only for v1 or also JS/TS package libs?                  | Angular first, JS next                                                     |
| Secondary entry points   | Should naming be comma string or repeated option?                | Accept comma string initially                                              |
| Default prefix           | Fixed `rnf` or configurable?                                     | Configurable later; `rnf` initially                                        |
| Dependency restructuring | Should Angular peer dependency restructuring live here?          | Yes for publishable Angular libraries                                      |
| Storybook/Compodoc       | Built into this generator or separate setup generators?          | Keep flags initially; split later if complex                               |

#### Acceptance criteria

```gherkin
Feature: nx-plugin:create-publishable-lib generator

  Scenario: publishable Angular library with secondary entry points
    When I run "pnpm nx g @rn-forge/nx-plugin:create-publishable-lib --name=my-ui --importPath=@acme/my-ui --framework=angular --secondaryEntryPoints=auth,form"
    Then libs/my-ui/ is created as an Nx project
    And libs/my-ui/auth/ and libs/my-ui/form/ secondary entry points exist
    And @angular/common is in peerDependencies not devDependencies
    And "pnpm nx build my-ui" succeeds

  Scenario: with storybook
    When I run "pnpm nx g @rn-forge/nx-plugin:create-publishable-lib --name=my-ui --importPath=@acme/my-ui --storybook"
    Then libs/my-ui/.storybook/ exists
    And project.json contains a storybook target

  Scenario: custom coverage threshold
    When I run "pnpm nx g @rn-forge/nx-plugin:create-publishable-lib --name=my-ui --importPath=@acme/my-ui --coverageThreshold=80"
    Then the test target has 80% coverage thresholds
```

---

### Generator: `@rn-forge/nx-plugin:setup-ci`

Adds repo-level CI workflows.

#### Usage

```bash
pnpm nx g @rn-forge/nx-plugin:setup-ci --provider=github
```

#### Schema

| Option           | Type    | Required | Default  | Description                     |
| ---------------- | ------- | -------- | -------- | ------------------------------- |
| `provider`       | enum    | no       | `github` | `github \| azure-devops`        |
| `packageManager` | enum    | no       | `pnpm`   | `pnpm \| npm \| yarn`           |
| `nodeVersion`    | string  | no       | `22`     | Node version used by CI         |
| `affected`       | boolean | no       | `true`   | Use Nx affected commands        |
| `force`          | boolean | no       | `false`  | Replace existing workflow files |

#### Steps

1. Detect package manager and lockfile.
2. Add CI workflow templates.
3. Add cache configuration.
4. Add install/build/lint/test commands.
5. Add affected mode when enabled.
6. Format files.

#### Requirement discussion

Before implementation, confirm:

| Topic            | Decision needed                         | Default proposal                      |
| ---------------- | --------------------------------------- | ------------------------------------- |
| CI provider      | GitHub only first, or Azure DevOps too? | GitHub first                          |
| pnpm version     | Pin via Corepack or action version?     | Use Corepack and packageManager field |
| Test commands    | Run all or affected?                    | Affected by default                   |
| Release workflow | Separate from CI?                       | Yes, handled by `setup-release`       |
| Agentic checks   | Include AI/codegen guardrails here?     | No, separate `setup-agentic-coding`   |

#### Acceptance criteria

```gherkin
Feature: nx-plugin:setup-ci generator

  Scenario: GitHub CI
    When I run "pnpm nx g @rn-forge/nx-plugin:setup-ci --provider=github"
    Then .github/workflows/ci.yml exists
    And the workflow runs install, lint, test, and build commands
```

---

### Generator: `@rn-forge/nx-plugin:setup-release`

Configures Nx release for publishable packages.

#### Usage

```bash
pnpm nx g @rn-forge/nx-plugin:setup-release --mode=independent
```

#### Schema

| Option       | Type    | Required | Default       | Description                                                           |
| ------------ | ------- | -------- | ------------- | --------------------------------------------------------------------- |
| `mode`       | enum    | no       | `independent` | `independent \| fixed` release versioning                             |
| `registry`   | string  | no       | npm default   | npm registry URL                                                      |
| `projects`   | string  | no       | —             | Comma-separated project list; default autodetect publishable projects |
| `ciProvider` | enum    | no       | `github`      | `github \| none`                                                      |
| `force`      | boolean | no       | `false`       | Replace existing release config                                       |

#### Steps

1. Detect publishable projects.
2. Patch `nx.json` release configuration.
3. Add release workflow if `ciProvider=github`.
4. Add package publishing defaults.
5. Format files.

#### Requirement discussion

Before implementation, confirm:

| Topic           | Decision needed                                | Default proposal                  |
| --------------- | ---------------------------------------------- | --------------------------------- |
| Version mode    | Independent or fixed for rn-forge packages?    | Independent for monorepo packages |
| Registry        | npm public, GitHub Packages, private registry? | npm default initially             |
| Changelog       | Per project or workspace-level?                | Per project if independent        |
| Release trigger | Manual dispatch, tag, or main branch?          | Manual dispatch initially         |

#### Acceptance criteria

```gherkin
Feature: nx-plugin:setup-release generator

  Scenario: independent release
    When I run "pnpm nx g @rn-forge/nx-plugin:setup-release --mode=independent"
    Then nx.json contains release configuration
    And publishable projects are included in the release project list
```

---

### Generator: `@rn-forge/nx-plugin:setup-boundaries`

Configures project tags and module boundary enforcement.

#### Usage

```bash
pnpm nx g @rn-forge/nx-plugin:setup-boundaries
```

#### Schema

| Option                    | Type    | Required | Default               | Description                      |
| ------------------------- | ------- | -------- | --------------------- | -------------------------------- |
| `tagModel`                | enum    | no       | `type-scope-platform` | Boundary tagging model           |
| `applyToExistingProjects` | boolean | no       | `false`               | Attempt to tag existing projects |
| `force`                   | boolean | no       | `false`               | Replace existing boundary config |

#### Steps

1. Add standard tag taxonomy documentation.
2. Patch eslint module-boundary rules.
3. Optionally apply tags to existing projects using best-effort inference.
4. Format files.

#### Requirement discussion

Before implementation, confirm:

| Topic                  | Decision needed                | Default proposal                         |
| ---------------------- | ------------------------------ | ---------------------------------------- |
| Tag taxonomy           | What tags are mandatory?       | `type:*`, `scope:*`, `platform:*`        |
| Existing projects      | Auto-tag or report only?       | Report only initially                    |
| Enforcement strictness | Warn or error?                 | Error in CI, local lint default behavior |
| Exceptions             | How to model shared utilities? | `scope:shared`, `type:util`              |

#### Acceptance criteria

```gherkin
Feature: nx-plugin:setup-boundaries generator

  Scenario: configure boundaries
    When I run "pnpm nx g @rn-forge/nx-plugin:setup-boundaries"
    Then eslint module boundary rules are configured
    And docs/architecture/project-boundaries.md exists
```

---

### Generator: `@rn-forge/nx-plugin:setup-agentic-coding`

Adds repo instructions and guardrails for AI-assisted coding.

#### Usage

```bash
pnpm nx g @rn-forge/nx-plugin:setup-agentic-coding --agents=claude,codex,copilot
```

#### Schema

| Option              | Type    | Required | Default                | Description                               |
| ------------------- | ------- | -------- | ---------------------- | ----------------------------------------- |
| `agents`            | string  | no       | `claude,codex,copilot` | Comma-separated agent instruction targets |
| `includePrompts`    | boolean | no       | `true`                 | Add prompt templates                      |
| `includeGuardrails` | boolean | no       | `true`                 | Add quality gate/guardrail docs           |
| `force`             | boolean | no       | `false`                | Replace existing files                    |

#### Steps

1. Add agent instruction files.
2. Add repo-specific coding rules.
3. Add prompt templates for common workflows.
4. Add guardrails around tests, lint, build, and release.
5. Format files.

#### Requirement discussion

Before implementation, confirm:

| Topic              | Decision needed                             | Default proposal                                      |
| ------------------ | ------------------------------------------- | ----------------------------------------------------- |
| Supported agents   | Which files are needed per agent?           | Claude, Codex, Copilot first                          |
| Source of truth    | One canonical file or duplicated per agent? | Canonical docs plus generated agent-specific wrappers |
| Guardrail commands | Which commands must agents run?             | format, lint, test, build for affected projects       |
| Safety rules       | Should dependency changes require approval? | Document as a guardrail, not enforced initially       |

#### Acceptance criteria

```gherkin
Feature: nx-plugin:setup-agentic-coding generator

  Scenario: add agent files
    When I run "pnpm nx g @rn-forge/nx-plugin:setup-agentic-coding"
    Then agent instruction files exist
    And prompt templates exist
    And quality gate instructions are documented
```

---

## Deliverable 3 — `create-rn-forge-ng-workspace` CLI

Thin wrapper around `create-nx-workspace` that then installs and invokes the plugin generators. All workspace wiring logic lives in the plugins; the CLI only handles greenfield workspace creation and orchestration.

### Location

```text
tools/create-workspace/
  src/
    index.ts              # shebang entry point
    cli.ts                # prompt + flag parsing
    steps/
      create-nx-workspace.ts
      install-plugins.ts
      run-nx-workspace.ts # runs @rn-forge/nx-plugin:setup-workspace
      run-ng-setup.ts     # runs @rn-forge/ng-plugin:setup
  package.json            -> create-rn-forge-ng-workspace
  tsconfig.json
  project.json
```

### Package metadata

```jsonc
{
  "name": "create-rn-forge-ng-workspace",
  "bin": { "create-rn-forge-ng-workspace": "./dist/index.js" },
  "dependencies": {
    "@clack/prompts": "^0.9.x",
    "execa": "^9.x",
  },
  "peerDependencies": {
    "@rn-forge/ng-plugin": "^<major>",
    "@rn-forge/nx-plugin": "^<major>",
  },
}
```

### CLI options

| Flag               | Prompt fallback     | Default         | Description                                |
| ------------------ | ------------------- | --------------- | ------------------------------------------ |
| `--name`           | `Workspace name?`   | —               | Workspace directory name                   |
| `--appName`        | `App name?`         | `app`           | Initial Angular application name           |
| `--directory`      | `Output directory?` | `process.cwd()` | Where to create the workspace              |
| `--packageManager` | `Package manager?`  | `pnpm`          | `pnpm \| npm \| yarn`                      |
| `--skipGit`        | flag only           | `false`         | Skip git init                              |
| `--skipNgSetup`    | flag only           | `false`         | Skip `@rn-forge/ng-plugin:setup`           |
| `--skipNxSetup`    | flag only           | `false`         | Skip `@rn-forge/nx-plugin:setup-workspace` |
| `--yes`            | flag only           | `false`         | Accept all defaults, no prompts            |

### Execution steps

1. Collect options and validate workspace name.
2. Run `create-nx-workspace` with the Angular monorepo preset.
3. Install `@rn-forge/nx-plugin` and `@rn-forge/ng-plugin` as dev dependencies.
4. Run `@rn-forge/nx-plugin:setup-workspace` unless skipped.
5. Run `@rn-forge/ng-plugin:setup --project=<appName>` unless skipped.
6. Print success command: `cd <name> && pnpm nx serve <appName>`.

On any step failure, print remaining manual recovery commands.

### Requirement discussion

Before implementation, confirm:

| Topic            | Decision needed                                       | Default proposal                                                  |
| ---------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| CLI package name | Keep Angular-specific name?                           | Keep `create-rn-forge-ng-workspace`                               |
| Nx preset flags  | Which exact `create-nx-workspace` flags are standard? | Use current preferred Angular monorepo flags from repo setup      |
| pnpm version     | Support pnpm v10 and v11?                             | Detect and document; avoid hard failure unless known incompatible |
| Plugin versions  | Install `latest` or matching CLI major?               | Matching CLI major when released                                  |
| Failure recovery | Print all remaining commands or only failed command?  | Print remaining commands                                          |

### Acceptance criteria

```gherkin
Feature: create-rn-forge-ng-workspace CLI

  Scenario: interactive greenfield
    Given no workspace exists at the target path
    When I run "pnpm dlx create-rn-forge-ng-workspace@latest"
    And I enter "my-workspace" and "shell"
    Then a valid Nx workspace is created at my-workspace/
    And @rn-forge/nx-plugin:setup-workspace has run
    And @rn-forge/ng-plugin:setup has run for "shell"
    And "pnpm nx serve shell" starts the app without errors

  Scenario: non-interactive via flags
    When I run "pnpm dlx create-rn-forge-ng-workspace@latest --name=acme --appName=portal --yes"
    Then the workspace is created without prompts

  Scenario: invalid workspace name rejected before any commands run
    When I run "pnpm dlx create-rn-forge-ng-workspace@latest --name='My App'"
    Then the CLI exits with a validation error

  Scenario: step failure prints recovery commands
    Given create-nx-workspace succeeds
    But @rn-forge/ng-plugin:setup exits non-zero
    Then the CLI prints the remaining manual steps and exits non-zero
```

---

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

---

## Migration from old spec

| Old generator/package                       | New location                                 | Status                      |
| ------------------------------------------- | -------------------------------------------- | --------------------------- |
| `@rn-forge/nx:workspace`                    | `@rn-forge/nx-plugin:setup-workspace`        | rename and narrow scope     |
| `@rn-forge/nx:app`                          | `@rn-forge/ng-plugin:setup`                  | move to Angular plugin      |
| `@rn-forge/nx:library`                      | `@rn-forge/nx-plugin:create-publishable-lib` | rename for clarity          |
| `@rn-forge/ng-bootstrap-tools setup-assets` | `@rn-forge/ng-plugin:add-bootstrap-table`    | replace gradually           |
| `create-rn-forge-ng-workspace`              | unchanged                                    | update to call both plugins |

---

## Open questions

1. **Published package path aliases** — validate whether consumer workspaces need `tsconfig.base.json` aliases for published `@rn-forge/ng` packages. Default should be no aliases unless local-linking requires them.
2. **Generator ownership for Angular library scaffolding** — decide whether `create-publishable-lib --framework=angular` should remain in `nx-plugin` or move to `ng-plugin` as `create-library`.
3. **Bootstrap Table support scope** — define the exact initial script/style/extension list before implementing `add-bootstrap-table`.
4. **Storybook and Compodoc** — decide whether these are flags on `create-publishable-lib` or separate generators.
5. **pnpm v10/v11 compatibility** — CLI should detect pnpm version and either warn or select compatible workspace creation flow.
6. **CI provider scope** — implement GitHub first, or include Azure DevOps templates from day one.
7. **Agentic coding scope** — decide whether this belongs in `@rn-forge/nx-plugin` v1 or a later `@rn-forge/devfoundry` package.
