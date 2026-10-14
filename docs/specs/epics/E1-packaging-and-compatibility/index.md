# E1 — Packaging and compatibility

**Status:** done · **Implemented:** 2026-09-20 (`c30d63a`) · **Owner:** ngkit

**Source:** former roadmap item H1.

The libraries install cleanly from their packed tarballs into a fresh Angular consumer, across the tested Angular matrix. No workspace protocols, source aliases, absolute local paths or undeclared runtime imports remain in a packed library. A consumer installs one Angular runtime without peer overrides, and a core-only production bundle carries no Bootstrap, jQuery or auth runtime code. Peers are the tested range ([ADR-0002](../../../adr/ADR-0002.md)); the packing and verification mechanics are in [Release pipeline](../../../architecture/release-pipeline.md).

[Back to the board](../../index.md)

| ID   | Delivered                                                                                                                                                                                                                                                                                                                                                                                                                                       | Implemented |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| F1.1 | Angular peer range and the consumer matrix: Angular 22.0.6 and 22.1.7, each with zone and zoneless change detection, installed from built tarballs by `ng:verify-consumer`. Angular peers of `ng` and `ng-bootstrap` are `^22.0.6`, except `ng-bootstrap`'s `@angular/cdk` at `^22.0.4`, left as-is because it already spans the tested versions. Exports, peer resolution and every secondary entry point are tested from the packed artifact. | `c30d63a`   |
| F1.2 | Implementation dependencies moved out of mandatory peers: `lodash-es`, `build-url-ts` and `jwt-decode` are `dependencies` of `ng`, declared through `allowedNonPeerDependencies`. `@angular/forms` and `@angular/router` remain peers. `ObjectUtil.diff` no longer imports `lodash-es`.                                                                                                                                                         | `c30d63a`   |
| F1.3 | The `workspace:` protocol is resolved in packed manifests: `resolve-dist-workspace-deps.mjs` rewrites it before `npm pack`, and `verify-dist-manifests.mjs` runs in CI as well as the release workflow. Fixed a real bug: plain `nx pack` shipped a literal `workspace:*` peer that no external install could resolve.                                                                                                                          | `c30d63a`   |

## Considered and rejected

- **A hand-built `>=22.0.6 <23` upper bound.** ngkit has no external consumers yet, so a plain caret range plus the tested matrix is enough and stays idiomatic.
- **Verdaccio, and a workspace fixture, for the consumer test.** Real `file:` tarball installs into throwaway fixtures outside the pnpm workspace glob exercise what a consumer gets, with nothing to run.

Verified with: `pnpm nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo`, `pnpm nx run-many -t pack --projects=ng,ng-bootstrap`, `node tools/scripts/verify-dist-manifests.mjs`, `pnpm nx run ng:verify-consumer`.
