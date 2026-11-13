#!/usr/bin/env bash
# S17.2.1 step 0: preconditions. Prints BASE: write it down.
set -euo pipefail
REF="${REF:-$PWD/../_reference/ngkit}"
KILN="${KILN:-$PWD/../kiln}"
REF_COMMIT=388fd00 # the reference, built by build-reference.sh
KILN_COMMIT=4b906e0 # kiln feature/v1, the commit the reference was built from
test "$(basename "$PWD")" = ngkit
test "$(git remote get-url origin | sed 's/\.git$//')" = https://github.com/rn-forge/ngkit
test "$(git branch --show-current)" = feature/kiln-cutover
for s in S17.2.6 S17.2.9 S17.2.10 S17.2.11; do
  test "$(git log --format=%s | grep -cx "$s")" -ge 1 || { echo "no commit $s" >&2; exit 1; }
done
test -z "$(git status --porcelain)"
test ! -e .rn-forge/kiln
test "$(git -C "$REF" rev-parse --short HEAD)" = "$REF_COMMIT"
test -z "$(git -C "$REF" status --porcelain)"
grep -qx 'ref = "feature/v1"' "$REF/.rn-forge/kiln/config.toml"
# Entry criterion: kiln's pushed feature/v1 holds the commit the reference was built from.
git -C "$KILN" fetch -q origin feature/v1
git -C "$KILN" merge-base --is-ancestor "$KILN_COMMIT" origin/feature/v1
git rev-parse HEAD # BASE: write it down
