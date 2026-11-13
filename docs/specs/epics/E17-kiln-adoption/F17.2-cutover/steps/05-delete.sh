#!/usr/bin/env bash
# S17.2.1 step 5: what kiln's generated files supersede.
# release.yml: the release is the `release` job of kiln's ci.yml (it would share the
# concurrency group). tools/ci: kiln's `ci:*` tasks do what the helpers did (step 6
# points nx.json at them), and `kiln doctor` replaces check-template.mjs.
# ci-template.md: the template concept retires (step 7 removes the links to it).
set -euo pipefail
rm .github/workflows/release.yml docs/architecture/ci-template.md
rm tools/ci/assemble-site.mjs tools/ci/check-template.mjs tools/ci/release-notes.mjs \
  tools/ci/resolve-dist-workspace-deps.mjs tools/ci/verify-dist-manifest.mjs
rmdir tools/ci
test ! -e tools/ci
