# ngkit

An [Nx](https://nx.dev) monorepo for the rn-forge Angular toolkit: reusable
libraries published as `@rn-forge/ng`, `@rn-forge/ng-bootstrap` and
`@rn-forge/ng-tailwind`, an Nx plugin published as `@rn-forge/ng-plugin`, plus a
demo app used for local development and e2e testing.

This workspace uses **pnpm**, not npm. Install it via
[Corepack](https://nodejs.org/api/corepack.html) (`corepack enable`) so you get
the version pinned in `package.json#packageManager`.

## Projects

| Project | Type | Description |
| -- | -- | -- |
| [`ng`](libs/ng/README.md) | library | Core Angular utilities (`libs/ng`), published as `@rn-forge/ng` |
| [`ng-bootstrap`](libs/ng-bootstrap/README.md) | library | Bootstrap-based UI kit (`libs/ng-bootstrap`), published as `@rn-forge/ng-bootstrap`, depends on `ng` |
| [`ng-tailwind`](libs/ng-tailwind/README.md) | library | Tailwind-friendly UI package (`libs/ng-tailwind`), published as `@rn-forge/ng-tailwind`: `--rnf-*` tokens and prebuilt component CSS, no Bootstrap |
| [`ng-plugin`](tools/ng-plugin/README.md) | library | Nx plugin (`tools/ng-plugin`), published as `@rn-forge/ng-plugin`: generators that set up Angular apps for the rn-forge libraries |

The demo, end-to-end and backend-fixture projects are listed in
[Workspace](docs/architecture/workspace.md#projects).

## Design principles

**Goal:** easy-to-use wrappers and plumbing to stand up an Angular web app
quickly, with best practices and industry standards built in, so the developer
writes only functional code.

1. **Standards and proven libraries first.** Use the published standard, then
   Angular, then a maintained npm package, and wrap rather than reimplement
   ([ADR-0001](docs/adr/ADR-0001.md)).
1. **Package boundaries are one-way.** `ng` has no UI, `ng-bootstrap` depends on
   `ng` and never the reverse, and presentation libraries only render
   ([ADR-0002](docs/adr/ADR-0002.md)).
1. **Every publishable library releases together.** They share one version and
   ship as tarballs on GitHub Releases ([ADR-0003](docs/adr/ADR-0003.md)).
1. **ngkit is upstream.** Apps build on these libraries instead of re-deriving
   them ([ADR-0001](docs/adr/ADR-0001.md)).

These principles apply to every current and future entry point and package. When
a plan or a change conflicts with one of them, the principle wins, unless the
plan or change records the deviation and its reason.

## Getting started

```sh
task setup
pnpm exec nx serve ng-demo
```

## Packing libraries

Each publishable project has a `pack` target that builds it and writes an
installable tarball under `dist/tarballs/`:

```sh
pnpm exec nx pack ng
pnpm exec nx pack ng-bootstrap
pnpm exec nx pack ng-tailwind
pnpm exec nx pack ng-plugin
```

No `task` verb packs every project locally; see
[Tooling gaps](docs/guides/development.md#tooling-gaps).

CI uploads these as a `package-tarballs` artifact on every run, and the release
job attaches them to the corresponding GitHub Release (both the versioned tag
and a rolling `latest` release). See
[docs/runbooks/releasing.md](docs/runbooks/releasing.md) for the full release
process and
[docs/architecture/release-pipeline.md](docs/architecture/release-pipeline.md)
for the design rationale.

## Documentation

- [docs/index.md](docs/index.md): where everything is, and in what order to read
  it.
- [Specs board](docs/specs/index.md): what is done, what is next.
- [Decisions](docs/adr/index.md): the ADR log.
- [Developing ngkit](docs/guides/development.md): commands, checks, adding
  projects.
- [Published site](https://rn-forge.github.io/ngkit/): Storybook and API
  reference.

## Useful links

- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx)
- [Releasing packages with Nx release](https://nx.dev/features/manage-releases)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins)
- [Discord](https://go.nx.dev/community) · [X](https://twitter.com/nxdevtools) ·
  [LinkedIn](https://www.linkedin.com/company/nrwl) ·
  [YouTube](https://www.youtube.com/@nxdevtools) · [Blog](https://nx.dev/blog)
