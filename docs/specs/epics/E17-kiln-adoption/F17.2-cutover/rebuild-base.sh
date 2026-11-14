#!/usr/bin/env bash
# Rebuild the cutover's base once: feature/release-3 gains the four pre-cutover
# stories without their F17.2-page hunks, then one commit with the other E17 pages.
# Usage, from the repository root: bash <this file>
# Plumbing only: it writes commit objects and moves no ref, index or worktree file.
# Author and committer fields are the originals', so a rerun prints the same hash.
set -euo pipefail
OLD_BASE=9ef6f350e1dcadff275a0bdbdf67a138c9c8a437 # feature/release-3 = origin/feature/release-3
OLD_TIP=476c058e81e2c30189e9fee01aa5555a7baedfe4  # feature/kiln-cutover before the rebuild
SPECS=docs/specs/epics/E17-kiln-adoption
PAGE=$SPECS/F17.2-cutover.md
# commit, then its subject, in the order they land
STORIES=(2e0594e S17.1.5 da3d6b3 S17.2.7 da64081 S17.2.6 7002943 S17.2.9)

test "$(basename "$PWD")" = ngkit
test "$(git rev-parse feature/release-3)" = "$OLD_BASE"
test "$(git rev-parse origin/feature/release-3)" = "$OLD_BASE"
git merge-base --is-ancestor "$OLD_BASE" "$OLD_TIP"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
export GIT_INDEX_FILE="$tmp/index"

# commit <tree> <parent> <source commit> [message]: author and committer from <source>
commit() {
  local tree="$1" parent="$2" src="$3" msg="${4:-}"
  [ -n "$msg" ] || msg="$(git log -1 --format=%B "$src")"
  GIT_AUTHOR_NAME="$(git log -1 --format=%an "$src")" \
    GIT_AUTHOR_EMAIL="$(git log -1 --format=%ae "$src")" \
    GIT_AUTHOR_DATE="$(git log -1 --format=%aI "$src")" \
    GIT_COMMITTER_NAME="$(git log -1 --format=%cn "$src")" \
    GIT_COMMITTER_EMAIL="$(git log -1 --format=%ce "$src")" \
    GIT_COMMITTER_DATE="$(git log -1 --format=%cI "$src")" \
    git commit-tree "$tree" -p "$parent" <<<"$msg"
}

head="$OLD_BASE"
git read-tree "$head"
for ((i = 0; i < ${#STORIES[@]}; i += 2)); do
  src="${STORIES[i]}" subject="${STORIES[i + 1]}"
  test "$(git log -1 --format=%s "$src")" = "$subject"
  git diff "$src^" "$src" -- . ":!$SPECS" | git apply --cached
  head="$(commit "$(git write-tree)" "$head" "$src")"
  echo "$subject $head"
done

# The other E17 pages and the board lines, as at OLD_TIP; the F17.2 page stays as
# it is at OLD_BASE, and its edits go into the "F17.2 Refinement" commit.
git read-tree "$OLD_TIP"
git update-index --cacheinfo "100644,$(git rev-parse "$OLD_BASE:$PAGE"),$PAGE"
msg="F17.1, F17.3–F17.5

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
head="$(commit "$(git write-tree)" "$head" "$OLD_TIP" "$msg")"
echo "F17.1, F17.3–F17.5 $head"

# The new tip differs from OLD_TIP only in the F17.2 page, which is OLD_BASE's.
git diff --quiet "$head" "$OLD_TIP" -- . ":!$PAGE"
git diff --quiet "$head" "$OLD_BASE" -- "$PAGE"
test "$(git diff --name-only "$head" "$OLD_TIP")" = "$PAGE"
echo "NEW_BASE=$head"
