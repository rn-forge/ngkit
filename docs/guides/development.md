# Developing ngkit

Commands, checks, and how to add an entry point or a library. Design principles are in [ADR-0001](../adr/ADR-0001.md) and [ADR-0002](../adr/ADR-0002.md).

## Commands

This workspace uses **pnpm**, not npm/npx. Install it via [Corepack](https://nodejs.org/api/corepack.html) (`corepack enable`) so you get the version pinned in `package.json#packageManager`.

```sh
pnpm install
pnpm nx serve ng-demo          # dev server
pnpm nx build ng-demo          # production bundle
pnpm nx build ng               # build the ng library
pnpm nx test ng-bootstrap      # unit tests
pnpm nx lint ng                # lint
pnpm nx e2e ng-demo-e2e        # playwright e2e, run locally
pnpm nx show project ng-demo   # list all available targets for a project
```

Targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks) from plugins (`nx.json#plugins`) or defined explicitly in each project's `project.json`.

Prefer `nx affected`/`nx run-many` over running a single project's target when working across the whole workspace; see [.github/workflows/ci.yml](../../.github/workflows/ci.yml) for how CI invokes these.

[More about running tasks in the docs »](https://nx.dev/features/run-tasks)

### Scaffolding projects

Use an [Nx plugin](https://nx.dev/concepts/nx-plugins) generator to scaffold new projects:

```sh
pnpm nx g @nx/angular:app demo
pnpm nx g @nx/angular:lib mylib
```

`pnpm nx list` shows installed plugins; `pnpm nx list <plugin-name>` shows what a specific plugin can generate. [Nx Console](https://nx.dev/getting-started/editor-setup) provides the same browsing experience inside your IDE.

[Learn more about Nx plugins »](https://nx.dev/concepts/nx-plugins) | [Browse the plugin registry »](https://nx.dev/plugin-registry)

## Checks before a PR

Each PR names its source files, public exports and test evidence. No vague "implement shared UI" tasks.

Inspect resolved Nx targets with `pnpm nx show project <name> --json`; run the relevant library lint/test/build/pack via Nx. For each new published entry point, add it to `ng:verify-consumer`'s matrix and test exports, peer resolution and runtime styles from the packed tarball. Confirm the `ng-demo` app still builds after core changes. Never run a release/publish as a validation shortcut.

```sh
pnpm nx run-many -t lint test build
pnpm nx run-many -t pack verify-dist verify-consumer
```

**Coverage.** `ng`'s test target enforces 80% statements/branches/functions/lines across `core`, `auth` and `crud` (`coverageInclude` in `libs/ng/project.json`). New code must clear it without lowering the thresholds.

## Adding a secondary entry point

For `@rn-forge/ng/<name>`, mirror `libs/ng/crud/` or `libs/ng/auth/`. Missing any one of these steps produces an entry point that builds locally but is broken when packed:

1. `libs/ng/<name>/ng-package.json` → `{ "lib": { "entryFile": "src/index.ts" } }`
2. `libs/ng/<name>/src/index.ts` → `export * from './lib/<name>.…';`
3. `tsconfig.base.json#compilerOptions.paths` → `"@rn-forge/ng/<name>": ["./libs/ng/<name>/src/index.ts"]`
4. [libs/ng/project.json](../../libs/ng/project.json) → add to `targets.test.options.include` (`"../<name>/src/**/*.spec.ts"`) **and** `coverageInclude` (`"libs/ng/<name>/src/**"`). The 80% coverage thresholds are enforced.
5. `libs/ng/package.json` → add any new peer deps to **both** `devDependencies` and `peerDependencies`. Angular packages are the exception to keeping them equal: their peers stay at the tested floor (`^22.0.6`) while `devDependencies` follow the workspace version ([ADR-0002](../adr/ADR-0002.md)). An implementation library goes in `dependencies`, declared in `ng-package.json`'s `allowedNonPeerDependencies`, and in the root `package.json`, like the existing ones.
6. Verify the packed output: `pnpm nx build ng && ls dist/libs/ng/<name>`.
7. Add the entry point to `tools/scripts/verify-consumer.mjs`'s matrix.

## Adding a publishable library

Scaffold the library through an Nx generator (`pnpm nx g @nx/angular:lib <name> --publishable`; check `--help` for the flags), then work through this list once:

1. `libs/<name>/package.json` carries the metadata `ng` and `ng-bootstrap` already have: `description`, `license`, `repository`, and `publishConfig.access: "public"`. Without it the package isn't really consumable externally even if it builds fine.
2. Tag it `publishable` in its `project.json`. The tag puts it in `nx.json#release.projects`, `preVersionCommand`, the release workflow and CI's package job, so none of them is edited ([Release pipeline](../architecture/release-pipeline.md#publishable-tag)).
3. In its `project.json`, set `release.version.manifestRootsToUpdate` to `{projectRoot}` plus `{ "path": "dist/{projectRoot}", "preserveLocalDependencyProtocols": false }`. Keep the `false` if a genuine `workspace:*` dependency is ever added between these libraries.
4. Declare `"pack": {}` and `"verify-dist": {}`, which take their definition from `nx.json#targetDefaults`, and an `nx-release-publish` target with `dryRun: true` while npm is disabled. Release steps pass `--excludeTaskDependencies`, so `pack` consumes the version-stamped `dist/` without rebuilding.
5. If the library ships non-TS assets alongside compiled entry points, add a `patch-package-exports` target and override `"pack": { "dependsOn": ["patch-package-exports"] }`, as `ng-bootstrap` does; `preVersionCommand` already runs it ([details](../architecture/release-pipeline.md#patch-package-exports)).
6. If it has a docs site, add a `compodoc` target and, for the docs site only, an `api/<name>/` entry in `.github/workflows/pages.yml` and `tools/pages/index.html`, plus Storybook or examples, without replacing Bootstrap's docs.
7. If it has consumer-facing entry points, add a `verify-consumer` target, add each entry point to `tools/scripts/verify-consumer.mjs`'s matrix, and test the exports from the packed artifact.
8. Add a row for it to the Projects table in `README.md` and [Workspace](../architecture/workspace.md).
9. Reviewing a pull request that adds a library, check `nx.json`, `project.json` and package metadata together: this is repository configuration, and it changes what is released.

A library that is Angular- or CDK-dependent lists those as framework peers; `ng` is a same-release peer only where the library uses shared behavior from it ([ADR-0002](../adr/ADR-0002.md)).
