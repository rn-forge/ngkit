#!/usr/bin/env bash
# S17.2.1 step 14: commit in groups, docs first, by explicit path. Real cutover only.
set -euo pipefail
test "$(git rev-parse HEAD)" = "${BASE:?set BASE to the commit step 0 printed}"
git add -- docs mkdocs.yml
git commit -m "S17.2.1 docs"
git add -- .rn-forge tasks Taskfile.yml .github/actions .github/dependabot.yml \
  '.github/workflows/_*.yml' .github/workflows/ci.yml .nx/workflows sonar-project.properties \
  .editorconfig .prettierrc .mdformat.toml .taplo.toml .yamlfmt.yaml .gitignore .prettierignore \
  AGENTS.md CLAUDE.md .python-version pyproject.toml uv.lock
git commit -m "S17.2.1 kiln"
git add -- .github/workflows/release.yml tools/ci
git commit -m "S17.2.1 legacy"
git add -- nx.json
git commit -m "S17.2.1 nx"
# Anything left is formatting of a file no step named: add it by its listed paths
# and commit it as "S17.2.1 format".
git status --porcelain
