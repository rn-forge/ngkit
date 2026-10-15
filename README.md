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
| `ng-demo-api`  | app     | Django backend fixture serving `ng-demo`'s `products` over the wire standards (`apps/ng-demo-api`)   |

Run `pnpm nx show project <name> --web` to see a project's full, resolved target list.

## Design principles

**Goal:** easy-to-use wrappers and plumbing to stand up an Angular web app quickly, with best practices and industry standards built in, so the developer writes only functional code.

1. **Standards and proven libraries first.** Use the published standard, then Angular, then a maintained npm package, and wrap rather than reimplement ([ADR-0001](docs/adr/ADR-0001.md)).
2. **Package boundaries are one-way.** `ng` has no UI, `ng-bootstrap` depends on `ng` and never the reverse, and presentation libraries only render ([ADR-0002](docs/adr/ADR-0002.md)).
3. **`ng` and `ng-bootstrap` release together.** They share one version and ship as tarballs on GitHub Releases ([ADR-0003](docs/adr/ADR-0003.md)).
4. **ngkit is upstream.** Apps build on these libraries instead of re-deriving them ([ADR-0001](docs/adr/ADR-0001.md)).

These principles apply to every current and future entry point and package. When a plan or a change conflicts with one of them, the principle wins, unless the plan or change records the deviation and its reason.

## Getting started

```sh
pnpm install
pnpm nx serve ng-demo
```

## Packing libraries

`ng` and `ng-bootstrap` each have a `pack` target that builds the library and produces an installable tarball under `dist/tarballs/`:

```sh
pnpm nx run-many -t pack -p tag:publishable
```

CI uploads these as a `package-tarballs` artifact on every run, and the `Release` workflow attaches them to the corresponding GitHub Release (both the versioned tag and a rolling `latest` release on `main`). See [docs/runbooks/releasing.md](docs/runbooks/releasing.md) for the full release process and [docs/architecture/release-pipeline.md](docs/architecture/release-pipeline.md) for the design rationale.

## Documentation

- [docs/index.md](docs/index.md): where everything is, and in what order to read it.
- [Specs board](docs/specs/index.md): what is done, what is next.
- [Decisions](docs/adr/index.md): the ADR log.
- [Developing ngkit](docs/guides/development.md): commands, checks, adding projects.
- [Published site](https://rn-forge.github.io/ngkit/): Storybook and API reference.

## Useful links

- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx)
- [Releasing packages with Nx release](https://nx.dev/features/manage-releases)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins)
- [Discord](https://go.nx.dev/community) · [X](https://twitter.com/nxdevtools) · [LinkedIn](https://www.linkedin.com/company/nrwl) · [YouTube](https://www.youtube.com/@nxdevtools) · [Blog](https://nx.dev/blog)
