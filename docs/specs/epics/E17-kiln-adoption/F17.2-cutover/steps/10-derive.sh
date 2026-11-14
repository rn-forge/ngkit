#!/usr/bin/env bash
# S17.2.1 step 10: derive. mkdocs.yml's nav from ngkit's docs tree, and the epic list in
# docs/specs/epics/index.md (step 4 copied it with an empty fence). S17.2.11 filled
# every other region, so a second run changes nothing.
set -euo pipefail
task docs:generate
before="$(git diff | shasum -a 256)"
task docs:generate
test "$(git diff | shasum -a 256)" = "$before"
