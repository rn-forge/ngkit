# Release pipeline

How ngkit builds, versions, packs and publishes its libraries. The choices behind it are [ADR-0003](../adr/ADR-0003.md); the procedure is [Releasing](../runbooks/releasing.md).

## Build once

**`dist/` is built once, by `nx.json#release.version.preVersionCommand`, and everything downstream consumes it read-only.** The command builds `ng` and `ng-bootstrap` and runs `patch-package-exports`. The version step then stamps the new version and rewrites `workspace:*` into the _already built_ `dist/libs/*/package.json`. Any later task that rebuilds regenerates those manifests from source and silently undoes it.

That is why the `Publish` and `Pack` steps in `release.yml` pass `--excludeTaskDependencies`, and why `nx-release-publish` carries no `dependsOn`: versioning edits `libs/*/package.json`, which invalidates the build cache, so a task dependency _will_ rebuild. `preVersionCommand` therefore has to produce a fully release-ready `dist/`, including `patch-package-exports`.

## Manifest roots

Each publishable library's `project.json` sets `release.version.manifestRootsToUpdate` to both `{projectRoot}` and `{ "path": "dist/{projectRoot}", "preserveLocalDependencyProtocols": false }`.

- `dist/` is gitignored and ng-packagr regenerates it from source on every build, so without also bumping the source manifest, `libs/*/package.json` on `main` would never reflect the released version.
- `workspace:*` references must never leak into a published dist manifest. `preserveLocalDependencyProtocols: false` on the dist manifest root is the guard; keep it if a genuine `workspace:*` dependency is ever added between these libraries.

## Pushing the release

`nx.json#release.changelog.workspaceChangelog.createRelease: "github"` is what makes `nx release` **push** the version commit and tag at all: Nx's `git.push` default is `false`, and the combined command only pushes when a remote release is configured. Without it the release commit and tag stay local to the runner and the later `gh release upload` steps have no tag to attach to.

## `patch-package-exports`

`ng-bootstrap`'s `patch-package-exports` target (`libs/ng-bootstrap/scripts/patch-package-exports.mjs`) fixes the ng-packagr dist `package.json`'s `exports` map so deep asset imports (`@rn-forge/ng-bootstrap/assets/*`) resolve at all. It is a `dependsOn` of `pack` (the plain `nx pack` path used by `ci.yml`) and is run explicitly by `preVersionCommand` on the release path. It must execute after every build of `ng-bootstrap` and before versioning stamps the dist manifest. Any new library shipping non-TS assets alongside compiled entry points needs the same pattern.

## Packing

`ng` and `ng-bootstrap` each have a `pack` target that builds the library and produces an installable tarball under `dist/tarballs/`. `tools/scripts/resolve-dist-workspace-deps.mjs` runs ahead of `npm pack`: it rewrites any `workspace:` protocol dependency in a dist manifest to the referenced local package's current version. Plain `nx pack` (the path `ci.yml`'s `package` job uses) never runs `nx release version`, so without it `ng-bootstrap`'s dist `package.json` would carry a literal `"@rn-forge/ng": "workspace:*"` peer that an external `npm` or `pnpm install` cannot resolve. It is a no-op once `nx release version` has already stamped an exact pin, so the real release path is unaffected.

`tools/scripts/verify-dist-manifests.mjs` asserts, for each `dist/libs/*/package.json`, that no `workspace:` protocol remains in its `dependencies`, `peerDependencies` or `optionalDependencies`, and that the ng-packagr output is complete: `name` and `version` are set, and there is `module` or `exports`, and `typings` or `exports`. It runs from both `ci.yml`'s `package` job and `release.yml`.

## Consumer verification

`tools/scripts/verify-consumer.mjs`, run by the `ng:verify-consumer` target (which depends on `pack`), installs the packed `@rn-forge/ng` tarball via `file:` into four throwaway fixtures under `dist/consumer-fixtures/` (outside the pnpm workspace glob): Angular 22.0.6 and 22.1.7, each with and without `zone.js` loaded. It smoke-tests every secondary entry point (`.`, `./core`, `./auth`, `./crud`) plus a `LocalStorageService` round-trip through DI, and asserts the installed manifest carries no `workspace:` protocol dependency. There is no verdaccio and no workspace fixture. It runs in `ci.yml`'s `package` job.

## CI

`.github/workflows/ci.yml` runs on push and pull request to `main` and `release/**`:

- **`ci-cloud`** (default): distributes `lint`/`test`/`build`/`e2e-ci` across Nx Cloud agents (`.nx/workflows/agents.yaml`).
- **`ci-local`**: the fallback that runs the same tasks on a single runner, with no Nx Cloud dependency. Select it by setting the repo variable `USE_NX_CLOUD` to `false`, or via `workflow_dispatch` with `use-nx-cloud` unchecked.
- **`package`**: runs after either path succeeds. It packs tarballs, verifies the dist manifests, runs `ng:verify-consumer`, and uploads the tarballs as a `package-tarballs` artifact.

Distributed versus local execution is a toggle, not two pipelines to maintain in parallel.

Playwright e2e uses the atomized `e2e-ci` target (`@nx/playwright/plugin`'s default `<targetName>-ci`) so Nx Cloud can distribute individual spec files as separate tasks. Only the cloud path needs it; the local fallback runs plain `e2e`.

## Release workflow

`release.yml` is a manual `workflow_dispatch`. It validates (lint, test, build), runs `nx release … --skip-publish` (version, changelog, commit, tag, push, GitHub Release), verifies the dist manifests, runs `nx release publish --tag=<dist-tag> --excludeTaskDependencies` (a dry run while npm is disabled), packs the tarballs without rebuilding, attaches them to the versioned GitHub Release, and moves the rolling `latest` release when run from `main`. The combined `nx release` command has no `--tag` flag, which is why publish is a separate step. A dry run uses `nx release version` instead, because the combined command writes no files under `--dry-run`, and dist manifests would keep their `workspace:*` references.

Release commit and tag are pushed to the branch the run started from, so the "Use workflow from" ref decides whether it is a normal release (`main`) or a hotfix (`release/<major>.x`).

The current version comes from git tags (`currentVersionResolver: "git-tag"`, falling back to `disk`, in each library's `project.json`). The resolver prefers tags reachable from the current branch, so on `release/1.x` it resolves `v1.2.0` and bumps to `1.2.1`, unaware of `v2.3.0` on `main`; hotfix branches need no extra configuration. Bumps are chosen by the person running the release, not derived from commits ([ADR-0003](../adr/ADR-0003.md)). The validate step runs lint, test and build only; e2e gates pull requests in `ci.yml`.

## Docs site

`pages.yml` publishes to GitHub Pages on push to `main` (changes under `libs/**` or the workflow itself) and on `workflow_dispatch`. It builds Storybook (`nx build-storybook ng-bootstrap`) and Compodoc (`nx run ng:compodoc`, `nx run ng-bootstrap:compodoc`), then assembles `dist/site/`: `storybook/`, `api/ng/`, `api/ng-bootstrap/`, a hand-written `index.html` copied from `tools/pages/index.html`, and an empty `.nojekyll`. A new publishable library gets its own `api/<name>/` entry the same way.
