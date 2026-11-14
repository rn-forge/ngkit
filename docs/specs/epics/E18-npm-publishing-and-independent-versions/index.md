# E18 — npm publishing and independent versions

|  |  |
| -- | -- |
| **State** | New |
| **Tags** | deferred |
| **Entry criteria** | F17.2 is merged into `main`, and kiln's findings on node-lib release are met: per-package tags and independent release, an npm release mode with provenance, and SBOM and attestation steps |

**Source:** owner decision, 2026-11-14: the libraries move from GitHub Releases
tarballs to npm, each with its own version. Until then
[ADR-0003](../../../adr/ADR-0003.md) stands, and its internal peers are already
caret ranges so that this move does not change their form.

[Back to the board](../../index.md)

<!-- BEGIN derived features -->

<!-- END derived features -->

Publish `@rn-forge/ng`, `@rn-forge/ng-bootstrap` and `@rn-forge/ng-tailwind` to
npm. This is an outline; its features and stories are written when the entry
criteria hold.

Scope, in the order it is likely to run:

- A new ADR that supersedes ADR-0003: independent versions with per-package
  tags, and internal peers as caret ranges (before 1.0 the ceiling is the next
  minor).
- Ownership of the `@rn-forge` npm scope checked, and the first publish of each
  package done by hand, since Trusted Publishing is configured per existing
  package.
- Publishing through Trusted Publishing (GitHub Actions OIDC, no token) with npm
  provenance.
- A CycloneDX SBOM per package (`npm sbom` or equivalent), attached to its
  release.
- Release evidence recorded on each release page.
- Consumer verification run against the registry rather than a tarball.
