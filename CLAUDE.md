<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Project Guidelines

See [README.md](README.md) for the project list and the packing workflow.

- **Start here:** read [docs/specs/index.md](docs/specs/index.md) (the board) before starting work; place docs by `docs/_structure.md`; find content through [docs/index.md](docs/index.md). Don't start or elaborate a deferred epic unless the owner asks.
- **Principles:** the [ADR log](docs/adr/index.md) binds every change. Record any deviation, with its reason, in the feature's Design or the doc comment.
- **Docs are self-contained:** they describe only this repository and name no other repository or surveyed application, except as `docs/specs/_structure.md` and ADR-0007 allow.
- **Commands and checks:** see [docs/guides/development.md](docs/guides/development.md).

### Release invariants

Details and reasons are in [docs/architecture/release-pipeline.md](docs/architecture/release-pipeline.md); the procedure is [docs/runbooks/releasing.md](docs/runbooks/releasing.md).

- `ng` and `ng-bootstrap` release together under fixed/grouped versioning ([ADR-0003](docs/adr/ADR-0003.md)); a new publishable library is tagged `publishable` (not added to `nx.json#release.projects`) and follows [docs/guides/development.md#adding-a-publishable-library](docs/guides/development.md#adding-a-publishable-library).
- `dist/` is built once by `release.version.preVersionCommand` and never rebuilt downstream: the `Publish` and `Pack` steps in `release.yml` pass `--excludeTaskDependencies`, and `nx-release-publish` has no `dependsOn`.
- Each publishable library's `release.version.manifestRootsToUpdate` is the pair `{projectRoot}` and `{ "path": "dist/{projectRoot}", "preserveLocalDependencyProtocols": false }`.
- `nx.json#release.changelog.workspaceChangelog.createRelease: "github"` is what makes `nx release` push the version commit and tag.
- Internal peers are exact pins on release, never widened by hand.
- `workspace:*` must not reach a dist manifest.
- npm is disabled (`dryRun: true` on both `nx-release-publish` targets); releases are tarballs on GitHub Releases.
- Hotfixes to an older major release from `release/<major>.x` with `dist-tag: v<major>-lts`, never `latest`.
- A new publishable library needs the same `package.json` metadata `ng`/`ng-bootstrap` have: `description`, `license`, `repository`, `publishConfig.access: "public"`.
- A library shipping non-TS assets needs `patch-package-exports` after every build and before versioning.

### CI

`ci.yml` is one toggle between distributed (`ci-cloud`) and local (`ci-local`) execution, plus a `package` job; Playwright uses the atomized `e2e-ci` target on the cloud path only. See [docs/architecture/release-pipeline.md#ci](docs/architecture/release-pipeline.md#ci).

### Docs site

Storybook and Compodoc publish to GitHub Pages on push to `main`, assembled under `dist/site/`. See [docs/architecture/release-pipeline.md#docs-site](docs/architecture/release-pipeline.md#docs-site).
