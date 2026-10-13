# Release pipeline

How ngkit builds, versions, packs and publishes its libraries. The choices behind it are [ADR-0003](../adr/ADR-0003.md); the procedure is [Releasing](../runbooks/releasing.md).

## Build once

**`dist/` is built once, by `nx.json#release.version.preVersionCommand`, and everything downstream consumes it read-only.** The command is `nx run-many -t build patch-package-exports -p tag:publishable`: it builds every project tagged `publishable` (see [Publishable tag](#publishable-tag)) and runs `patch-package-exports` where a project defines it. The version step then stamps the new version and rewrites `workspace:*` into the _already built_ `dist/libs/*/package.json`. Any later task that rebuilds regenerates those manifests from source and silently undoes it.

That is why the `Verify` and `Publish` steps in `release.yml` pass `--excludeTaskDependencies`, and why `nx-release-publish` carries no `dependsOn`: versioning edits `libs/*/package.json`, which invalidates the build cache, so a task dependency _will_ rebuild. `preVersionCommand` therefore has to produce a fully release-ready `dist/`, including `patch-package-exports`. The one exception is resuming a release, which rebuilds `dist/` from the tag (see [Release workflow](#release-workflow)).

## Publishable tag

A library is released when its `project.json` carries the tag `publishable`. `nx.json#release.projects` is `["tag:publishable"]` and `preVersionCommand` and the `release.yml` steps select `-p tag:publishable`, so no project list appears in release config or workflows. Adding a library to the release is tagging it.

## Manifest roots

Each publishable library's `project.json` sets `release.version.manifestRootsToUpdate` to both `{projectRoot}` and `{ "path": "dist/{projectRoot}", "preserveLocalDependencyProtocols": false }`.

- `dist/` is gitignored and ng-packagr regenerates it from source on every build, so without also bumping the source manifest, `libs/*/package.json` on `main` would never reflect the released version.
- `workspace:*` references must never leak into a published dist manifest. `preserveLocalDependencyProtocols: false` on the dist manifest root is the guard; keep it if a genuine `workspace:*` dependency is ever added between these libraries.

## Pushing the release

`nx.json#release.changelog.workspaceChangelog.createRelease` is `false`, so `nx release` versions, writes `CHANGELOG.md`, commits and tags locally only and pushes nothing. `release.yml` pushes the release commit and tag itself (`git push --atomic`) only after `pack`, `verify-dist` and `verify-consumer` pass on the built `dist/`, so a failed check leaves nothing public. It then creates the GitHub Release with one `gh release create`, which uploads the tarballs and uses the `CHANGELOG.md` section extracted by `tools/ci/release-notes.mjs` as the notes.

## `patch-package-exports`

`ng-bootstrap`'s `patch-package-exports` target (`libs/ng-bootstrap/scripts/patch-package-exports.mjs`) fixes the ng-packagr dist `package.json`'s `exports` map so deep asset imports (`@rn-forge/ng-bootstrap/assets/*`) resolve at all. It is a `dependsOn` of `ng-bootstrap`'s `pack` override (the plain `nx pack` path used by `ci.yml`) and is run by `preVersionCommand` on the release path for every publishable project that defines it. It must execute after every build of `ng-bootstrap` and before versioning stamps the dist manifest. Any new library shipping non-TS assets alongside compiled entry points needs the same pattern.

## Packing

`pack` and `verify-dist` are defined once, in `nx.json#targetDefaults`; each publishable `project.json` declares them as `"pack": {}` and `"verify-dist": {}`. `ng-bootstrap`'s only override is `"pack": { "dependsOn": ["patch-package-exports"] }`.

- **`pack`** depends on `build`, runs `tools/ci/resolve-dist-workspace-deps.mjs` on the dist manifest, then `npm pack` into `dist/tarballs/`. The script rewrites any `workspace:` protocol dependency to the referenced local package's current version, reading name and version from every project root Nx reports. Plain `nx pack` (the path `ci.yml`'s `package` job uses) never runs `nx release version`, so without it `ng-bootstrap`'s dist `package.json` would carry a literal `"@rn-forge/ng": "workspace:*"` peer that an external `npm` or `pnpm install` cannot resolve. It is a no-op once `nx release version` has already stamped an exact pin, so the real release path is unaffected.
- **`verify-dist`** depends on `pack` and is never cached. It runs `tools/ci/verify-dist-manifest.mjs dist/<projectRoot>`, which asserts that no `workspace:` protocol remains in the manifest's `dependencies`, `peerDependencies` or `optionalDependencies`, and that the ng-packagr output is complete: `name` and `version` are set, and there is `module` or `exports`, and `typings` or `exports`. It runs from both `ci.yml`'s `package` job and `release.yml`.

## Consumer verification

`tools/scripts/verify-consumer.mjs`, run by the `verify-consumer` target (which depends on `pack`), installs the packed `@rn-forge/ng` tarball via `file:` into four throwaway fixtures under `dist/consumer-fixtures/` (outside the pnpm workspace glob): Angular 22.0.6 and 22.1.7, each with and without `zone.js` loaded. It smoke-tests every secondary entry point (`.`, `./core`, `./auth`, `./crud`) plus a `LocalStorageService` round-trip through DI, and asserts the installed manifest carries no `workspace:` protocol dependency. There is no verdaccio and no workspace fixture. It runs in `ci.yml`'s `package` job.

## CI

`.github/workflows/ci.yml` runs on push and pull request to `main` and `release/**`:

- **`ci-cloud`** (default): distributes `lint`/`test`/`build`/`e2e-ci` across Nx Cloud agents using the `linux-medium` launch template (`.nx/workflows/agents.yaml`); the agent count comes from the repo variable `NX_CLOUD_AGENTS` (optional, default 3).
- **`ci-local`**: the fallback that runs the same tasks on a single runner, with no Nx Cloud dependency. Playwright browsers install only when a project has an `e2e` target. Select it by setting the repo variable `USE_NX_CLOUD` to `false`, or via `workflow_dispatch` with `use-nx-cloud` unchecked.
- **`package`**: runs after either path succeeds. It runs `nx run-many -t pack verify-dist verify-consumer` (every project that defines each target) and uploads the tarballs as a `package-tarballs` artifact.
- **`sonar`**: skipped on Dependabot and fork pull requests (no `SONAR_TOKEN`). Runs `nx run-many -t test`, then finds every `coverage/**/lcov.info` and passes the list to the scanner as `-Dsonar.javascript.lcov.reportPaths`. It fails when none is found. `sonar-project.properties` names no coverage path, so a project with tests is covered without editing config. It passes `-Dsonar.qualitygate.wait=true`, so the job waits for the quality gate and fails when the gate fails.
- **`docs`**: the docs site, described under [Docs site](#docs-site). It runs only on `main`, after `ci-cloud` or `ci-local` passes.
- **`ci-ok`**: the one check branch protection requires. It runs last (`always()`, `needs:` every other job) and fails when any needed job failed or was cancelled, or when neither `ci-cloud` nor `ci-local` succeeded; skipped jobs (Sonar on Dependabot and fork PRs, `docs` off `main`, the unused `ci-*` path) pass.

Every job except `ci-ok` checks out the repository, then uses the shared `.github/actions/setup` action, which installs pnpm (version from `package.json#packageManager`) and Node (version from `.nvmrc`) and runs `pnpm install --frozen-lockfile`.

Distributed versus local execution is a toggle, not two pipelines to maintain in parallel.

Playwright e2e uses the atomized `e2e-ci` target (`@nx/playwright/plugin`'s default `<targetName>-ci`) so Nx Cloud can distribute individual spec files as separate tasks. Only the cloud path needs it; the local fallback runs plain `e2e`.

## Release workflow

`release.yml` is a manual `workflow_dispatch` with two jobs, `release` and `published-install`.

**CI gate.** The first step requires a successful `ci.yml` run for the commit being released: `HEAD`, or `HEAD^` when `HEAD` carries a `v*` tag (a release commit is pushed with `GITHUB_TOKEN`, which starts no workflow, so `HEAD^` is the commit CI checked). Without one, a real release fails; a dry run warns and continues. The workflow runs no lint, test or e2e of its own.

**Order.** Version locally (`nx release … --skip-publish`: version, changelog, commit, tag, no push) → `pack`, `verify-dist` and `verify-consumer` on the built `dist/` → push the commit and tag atomically → create the GitHub Release with its tarballs and `CHANGELOG.md` notes in one `gh release create` → `nx release publish --tag=<dist-tag> --excludeTaskDependencies` (a dry run while npm is disabled) → move the rolling `latest` release. The combined `nx release` command has no `--tag` flag, which is why publish is a separate step. A dry run uses `nx release version` with no commit or tag instead, because the combined command writes no files under `--dry-run`, and dist manifests would keep their `workspace:*` references; it verifies and previews the publish but creates nothing.

**Modes.** A version counts as shipped when its GitHub Release is published (not a draft). A real run looks at the `v*` tags on `HEAD` (more than one fails):

| Tag at `HEAD` | Published release for it | Mode       | Run does                                                                                                                                                                                     |
| ------------- | ------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| none          | n/a                      | `new`      | the full order above                                                                                                                                                                         |
| yes           | no                       | `resume`   | rebuilds `dist/` from the tagged source (`pack verify-dist verify-consumer` with task dependencies), deletes any draft for the tag, then creates the release, publishes and updates `latest` |
| yes           | yes                      | `released` | skips the build, release creation and publish; only brings `latest` up to date                                                                                                               |

A failure before the push leaves nothing public, and a rerun computes the same version. After the push, a rerun from the same ref finds the tag at `HEAD` and finishes that version instead of bumping.

**Rolling `latest`.** It moves only on `main`; hotfix releases from `release/**` keep their own versioned release. The step is idempotent: it is skipped when the remote `latest` tag already points at this tag's commit and the `latest` release has the same asset names as the tag's release. Otherwise it deletes and recreates `latest` with the tarballs (downloaded from the published release in `released` mode).

**`published-install`.** After `release`, on real runs only, it checks out the tag, downloads the tarballs from the published GitHub Release and runs `verify-consumer` on them, so the install is checked against what consumers download rather than what the runner built.

Release commit and tag are pushed to the branch the run started from, so the "Use workflow from" ref decides whether it is a normal release (`main`) or a hotfix (`release/<major>.x`).

The current version comes from git tags (`currentVersionResolver: "git-tag"`, falling back to `disk`, in each library's `project.json`). The resolver prefers tags reachable from the current branch, so on `release/1.x` it resolves `v1.2.0` and bumps to `1.2.1`, unaware of `v2.3.0` on `main`; hotfix branches need no extra configuration. Bumps are chosen by the person running the release, not derived from commits ([ADR-0003](../adr/ADR-0003.md)).

## Docs site

The `docs` job in `ci.yml` publishes to GitHub Pages. It runs on push to `main` (and `workflow_dispatch` on `main`) after `ci-cloud` or `ci-local` passes, so a failing commit never deploys. It builds only when a project with a `compodoc` or `build-storybook` target is affected (`nx show projects --affected --with-target <target>` against the `nx-set-shas` base); a manual run always builds. Its `pages` concurrency group has `cancel-in-progress: false`, so a deployment in progress is never cancelled.

The job names no project. Each project declares its own doc targets with a fixed output convention: `compodoc` writes `dist/compodoc/{projectName}` and `build-storybook` writes `dist/storybook/{projectName}`. `tools/ci/assemble-site.mjs` reads the projects that declare each target and assembles `dist/site/`: `api/<project>/` per `compodoc` project, `storybook/<project>/` per `build-storybook` project, an empty `.nojekyll`, and a generated `index.html` with one card per entry, labelled with the project name and, when the project root has a `package.json`, its `description`. It fails naming the project when an expected output directory is missing. A new library appears on the site by declaring the targets.
