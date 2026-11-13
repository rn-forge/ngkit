#!/usr/bin/env bash
# S17.2.10: format ngkit's own files with kiln's formatters and write the result as a patch.
# Usage, from the repository root: bash <this file> <patch-path>   (outside the repository)
# Overlays S17.2.1 steps 01 to 04, formats, and stops. It resets and cleans nothing.
set -euo pipefail
PATCH="${1:?usage: format.sh <patch-path>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case "$(cd "$(dirname "$PATCH")" && pwd)/" in "$PWD"/*) echo "patch must be outside the repository" >&2; exit 1 ;; esac

test "$(basename "$PWD")" = ngkit
test "$(git branch --show-current)" = feature/kiln-cutover
test "$(git log -1 --format=%s)" = "F17.2 Refinement"
test -z "$(git status --porcelain)"

for step in 01-managed 02-config 03-blocks 04-seeded; do
  bash "$HERE/steps/$step.sh" >/dev/null
done
git status --porcelain >"$PATCH.overlay"
task setup
task format

# Every tracked path the formatters changed that the overlay did not write. The lock
# files are setup's, not the formatters'.
sed 's/^...//' "$PATCH.overlay" >"$PATCH.overlay-paths"
paths=()
while IFS= read -r path; do
  paths+=("$path")
done < <(git diff --name-only -- . ':!pnpm-lock.yaml' | grep -vxF -f "$PATCH.overlay-paths" || true)
rm "$PATCH.overlay-paths"
test "${#paths[@]}" -gt 0 || { echo "no formatting-only change" >&2; exit 1; }

git diff -- "${paths[@]}" >"$PATCH"
printf '%s\n' "${paths[@]}"
echo "${#paths[@]} files in $PATCH; overlay paths in $PATCH.overlay"
