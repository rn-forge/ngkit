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

See [README.md](README.md) for the project list, common `pnpm nx` commands, and the packing/tarball workflow.

### Publishing & release

- `ng` and `ng-bootstrap` release together under **fixed/grouped versioning** (`nx.json#release.projectsRelationship: "fixed"`) — every release bumps and republishes both, even if only one changed. A new publishable library must be added to `nx.json#release.projects` too.
- Each publishable library's `project.json` sets `release.version.manifestRootsToUpdate` to both `{projectRoot}` and `{ "path": "dist/{projectRoot}", "preserveLocalDependencyProtocols": false }`. `dist/` is gitignored and ng-packagr regenerates it from source on every build, so without also bumping the source manifest, `libs/*/package.json` on `main` would never reflect the released version. Any new publishable library needs this same pair.
- `nx.json#release.version.preserveMatchingDependencyRanges` is `false` — required because both packages are pre-1.0, and semver's zero-major rules (`^0.0.1` matches only `0.0.1` exactly) make Nx hard-error on the default `true` the moment a peer version bumps.
- Internal peer deps between these libraries (e.g. `ng-bootstrap`'s peer on `ng`) get rewritten to an **exact pin** on release, not a `^` range — the same convention Angular uses between its own lockstep-released packages. Don't manually widen these.
- `workspace:*` protocol references must never leak into a published dist manifest. `preserveLocalDependencyProtocols: false` on the dist manifest root is the guard — keep it if a genuine `workspace:*` dependency is ever added between these libraries.
- npm publishing is currently **disabled** — `dryRun: true` is hardcoded on both libraries' `nx-release-publish` targets. Releases currently distribute as tarballs attached to GitHub Releases (`pack` targets + `release.yml`), not npm packages. To re-enable npm: remove the hardcoded `dryRun` and set up npm Trusted Publishing (GitHub Actions OIDC, no long-lived token) per package on npmjs.com.
- Hotfixes to an older major: cut `release/<major>.x` on demand from the last tag of that major, land the fix on `main` first and cherry-pick back, then release from that branch with `dist-tag: v<major>-lts` — never `latest`, which only ever moves on releases from `main`.
- Any new publishable library needs the same `package.json` metadata `ng`/`ng-bootstrap` already have — `description`, `license`, `repository`, `publishConfig.access: "public"` — without it the package isn't really consumable externally even if it builds fine.
- `ng-bootstrap`'s `patch-package-exports` target fixes the ng-packagr dist `package.json`'s `exports` map so deep asset imports (`@rn-forge/ng-bootstrap/assets/*`) resolve at all. It's a hard `dependsOn` for both `pack` and `nx-release-publish` — don't break that chain, and any new library shipping non-TS assets alongside compiled entry points will need the same pattern.

### CI

- Distributed vs. local execution is a toggle, not two pipelines to maintain in parallel — see `ci.yml`'s `ci-cloud`/`ci-local`/`package` jobs and the `USE_NX_CLOUD` repo variable (or the `use-nx-cloud` `workflow_dispatch` input).
- Playwright e2e uses the atomized `e2e-ci` target (`@nx/playwright/plugin`'s default `<targetName>-ci`) so Nx Cloud can distribute individual spec files as separate tasks. Only the cloud path needs it — the local fallback runs plain `e2e`.

### Docs site

- Storybook (`ng-bootstrap`) + Compodoc (`ng`, `ng-bootstrap`) publish to GitHub Pages on push to `main`, assembled under `dist/site/` (`storybook/`, `api/ng/`, `api/ng-bootstrap/`, plus a hand-written `index.html` from `tools/pages/index.html`). A new publishable library should get its own `api/<name>/` entry the same way.
