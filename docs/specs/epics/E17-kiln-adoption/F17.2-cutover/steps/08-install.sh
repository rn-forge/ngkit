#!/usr/bin/env bash
# S17.2.1 step 8: install. pnpm-lock.yaml does not move; uv writes the root tooling
# project's lock, which is the reference's.
set -euo pipefail
REF="${REF:-$PWD/../_reference/ngkit}"
task setup
git diff --quiet -- pnpm-lock.yaml package.json
cmp uv.lock "$REF/uv.lock"
