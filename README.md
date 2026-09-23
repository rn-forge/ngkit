# ngkit

An [Nx](https://nx.dev) monorepo for the rn-forge Angular toolkit: reusable libraries published as `@rn-forge/ng` and `@rn-forge/ng-bootstrap`, plus a demo app used for local development and e2e testing.

This workspace uses **pnpm**, not npm/npx. Install it via [Corepack](https://nodejs.org/api/corepack.html) (`corepack enable`) so you get the version pinned in `package.json#packageManager`.

## Projects

| Project        | Type    | Description                                                                                          |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `ng`           | library | Core Angular utilities (`libs/ng`), published as `@rn-forge/ng`                                      |
| `ng-bootstrap` | library | Bootstrap-based UI kit (`libs/ng-bootstrap`), published as `@rn-forge/ng-bootstrap`, depends on `ng` |
| `ng-demo`      | app     | Demo/dev app exercising both libraries (`apps/ng-demo`)                                              |
| `ng-demo-e2e`  | e2e app | Playwright tests for `ng-demo` (`apps/ng-demo-e2e`)                                                  |

Run `pnpm nx show project <name> --web` to see a project's full, resolved target list.

## Design principles

**Goal:** easy-to-use wrappers and plumbing to stand up an Angular web app quickly, with best practices and industry standards built in, so the developer writes only functional code. These are the same principles as [pykit](https://github.com/rn-forge/pykit#design-principles), applied to Angular.

1. **Don't reimplement a proven library.** Use Angular first (`HttpClient`, `Router`, CDK, signals, `httpResource`), then a maintained, widely used npm package. Zero dependencies is not a goal. A small, deliberate dependency set is. Follow published standards (OpenAPI, RFC 9457, W3C Trace Context and so on) directly. Order of preference: the published standard, then the framework's own mechanism, then an ngkit wrapper.
2. **Wrap for one design language.** When a library's setup or call syntax is verbose or doesn't match the rest of the kit, ship a thin wrapper. The wrapper standardizes; it doesn't extend, fork or vendor.
3. **Package boundaries are non-negotiable.** `ng` has no UI and no presentation dependencies. `ng-bootstrap` depends on `ng`, never the reverse. A future `ng-tailwind` must not import `ng-bootstrap`. State and behavior shared between presentation libraries live in `ng`. Angular and RxJS are peers. Implementation libraries are `dependencies`, declared in `allowedNonPeerDependencies`. Secondary entry points can't declare their own peers, so a heavy, situational dependency goes behind an optional peer.
4. **ngkit is upstream.** Apps build on these libraries instead of re-deriving them, so apps that share ngkit share logic and read alike.

These principles apply to every current and future entry point and package. When a plan or a change conflicts with one of them, the principle wins, unless the plan or change records the deviation and its reason.

On #1, hand-roll only in one of these cases, and say which one in the class or file doc comment:

- Nothing maintained covers the concern. Check npm before deciding this; don't rely on memory.
- The candidate library would break a package boundary.
- The needed slice really is a few lines, and the candidate is unmaintained or much heavier.

On #2, a wrapper follows these rules:

- **Configuration** is a readonly typed interface, registered once through `provideRnForge<Area>Config(config)` and an `InjectionToken`. Don't use long positional argument lists or loose option bags.
- **Missing required configuration** fails at injection with an `Error` whose message is prefixed `[rn-forge.ng.<area>]` and names the provider to call.
- **Errors from the underlying library pass through unchanged.** For example, `HttpErrorResponse` stays an `HttpErrorResponse`.
- **Logging** happens only through `isDebugMode()` (`?__DEBUG`). Never write to the console unconditionally.
- **Public symbols** are exported from the entry point's `src/index.ts`.
- **The underlying Angular or library object stays reachable** as an escape hatch.

On #4, surveys of existing apps (such as CIMS) are prior art that informs the design, not compatibility constraints. Where an app got something wrong, fix it here instead of copying it.

`@nx/dependency-checks` (lint) and `ng:verify-consumer` (packed-tarball install) catch undeclared and leaked dependencies. Nothing lints the direction between entry points and packages yet (`@nx/enforce-module-boundaries` has no tag constraints), so review enforces it.

## Getting started

```sh
pnpm install
pnpm nx serve ng-demo
```

## Run tasks

```sh
pnpm nx serve ng-demo          # dev server
pnpm nx build ng-demo          # production bundle
pnpm nx build ng               # build the ng library
pnpm nx test ng-bootstrap      # unit tests
pnpm nx lint ng                # lint
pnpm nx e2e ng-demo-e2e        # playwright e2e, run locally
pnpm nx show project ng-demo   # list all available targets for a project
```

Targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks) from plugins (`nx.json#plugins`) or defined explicitly in each project's `project.json`.

Prefer `nx affected`/`nx run-many` over running a single project's target when working across the whole workspace — see [.github/workflows/ci.yml](.github/workflows/ci.yml) for how CI invokes these.

[More about running tasks in the docs »](https://nx.dev/features/run-tasks)

## Packing libraries

`ng` and `ng-bootstrap` each have a `pack` target that builds the library and produces an installable tarball under `dist/tarballs/`:

```sh
pnpm nx run-many -t pack --projects=ng,ng-bootstrap
```

CI uploads these as a `package-tarballs` artifact on every run, and the `Release` workflow attaches them to the corresponding GitHub Release (both the versioned tag and a rolling `latest` release on `main`). See [docs/RELEASING.md](docs/RELEASING.md) for the full release process and [docs/specs/release-and-cicd.md](docs/specs/release-and-cicd.md) for the design rationale.

## Add new projects

Use an [Nx plugin](https://nx.dev/concepts/nx-plugins) generator to scaffold new projects:

```sh
pnpm nx g @nx/angular:app demo
pnpm nx g @nx/angular:lib mylib
```

`pnpm nx list` shows installed plugins; `pnpm nx list <plugin-name>` shows what a specific plugin can generate. [Nx Console](https://nx.dev/getting-started/editor-setup) provides the same browsing experience inside your IDE.

[Learn more about Nx plugins »](https://nx.dev/concepts/nx-plugins) | [Browse the plugin registry »](https://nx.dev/plugin-registry)

## CI

`.github/workflows/ci.yml` runs on push/PR:

- **`ci-cloud`** (default): distributes `lint`/`test`/`build`/`e2e-ci` across Nx Cloud agents (`.nx/workflows/agents.yaml`).
- **`ci-local`**: fallback that runs the same tasks on a single runner — no Nx Cloud dependency. Select it by setting the repo variable `USE_NX_CLOUD` to `false`, or via `workflow_dispatch` with `use-nx-cloud` unchecked.
- **`package`**: runs after either path succeeds — verifies publishable dist manifests, packs tarballs, uploads them as a build artifact.

## Useful links

- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx)
- [Releasing packages with Nx release](https://nx.dev/features/manage-releases)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins)
- [Discord](https://go.nx.dev/community) · [X](https://twitter.com/nxdevtools) · [LinkedIn](https://www.linkedin.com/company/nrwl) · [YouTube](https://www.youtube.com/@nxdevtools) · [Blog](https://nx.dev/blog)
