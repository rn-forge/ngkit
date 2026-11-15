#!/usr/bin/env bash
# Build the reference repository for S17.2.1 from ngkit-new.toml and ngkit-deps.sh.
# Usage, from ngkit's root: bash <this file>   (REF and KILN override the default paths)
# It deletes nothing and commits nothing: the owner commits the reference afterwards.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGKIT="$(cd "$HERE/../../../../.." && pwd)"
WS="$(cd "$NGKIT/.." && pwd)"
KILN="${KILN:-$WS/kiln}"
REF="${REF:-$WS/_reference/ngkit}"

# The caller deletes both, so nothing here removes a directory.
test ! -e "$REF" || { echo "remove $REF first" >&2; exit 1; }
test ! -e "$KILN/.staging/ngkit" || { echo "remove $KILN/.staging/ngkit first" >&2; exit 1; }
test "$(git -C "$KILN" branch --show-current)" = feature/v1 || { echo "kiln is not on feature/v1" >&2; exit 1; }
test -z "$(git -C "$KILN" status --porcelain --untracked-files=no)" || { echo "kiln has uncommitted changes" >&2; exit 1; }
echo "kiln at $(git -C "$KILN" rev-parse --short HEAD)"

(cd "$KILN" && uv run kiln new "$REF" --archetype node-lib --docs mkdocs \
  --owner rn-forge --config "$HERE/ngkit-new.toml" --yes)
cd "$REF"
task setup
bash "$HERE/ngkit-deps.sh" "$NGKIT/package.json"
task setup
# Expected to exit 0 (observed at cf80215, 2026-11-09).
task validate
