#!/usr/bin/env bash
# S17.2.1 step 4: seeded files ngkit does not have, the root tooling project kiln
# gives every node-lib, and docs/_areas.yml in the reference's shape (F17.1 S17.1.4).
# ngkit's own seeded pages and ngkit.code-workspace stay ngkit's. uv.lock is not
# copied: `task setup` writes it (step 8 compares it with the reference's).
set -euo pipefail
REF="${REF:-$PWD/../_reference/ngkit}"
for f in .mdformat.toml .taplo.toml .yamlfmt.yaml .python-version pyproject.toml \
  docs/runbooks/recovering-from-drift.md docs/specs/epics/index.md docs/specs/ideas/index.md; do
  test ! -e "$f" || { echo "$f exists" >&2; exit 1; }
  mkdir -p "$(dirname "$f")"
  cp "$REF/$f" "$f"
done
cp "$REF/docs/_areas.yml" docs/_areas.yml
