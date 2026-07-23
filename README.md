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
