#!/usr/bin/env bash
# S17.2.1 step 13: acceptance. Exits 0 and prints nothing when the overlay is right.
set -euo pipefail
REF="${REF:-$PWD/../_reference/ngkit}"

# What kiln replaced is gone.
test ! -e .github/workflows/release.yml
test ! -e tools/ci
test ! -e docs/architecture/ci-template.md
! grep -q 'tools/ci/' nx.json

# Nothing is staged; ngkit's code, manifests and lock are untouched.
git diff --cached --quiet
git diff --quiet HEAD -- apps libs tools/scripts package.json pnpm-lock.yaml \
  pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs .nvmrc .verdaccio .vscode \
  ngkit.code-workspace project.json README.md CHANGELOG.md
test -z "$(git ls-files --others --exclude-standard -- apps libs tools)"

# config.toml and state.json are the reference's; CLAUDE.md is the reference's pointer.
cmp -s .rn-forge/kiln/config.toml "$REF/.rn-forge/kiln/config.toml"
cmp -s .rn-forge/kiln/state.json "$REF/.rn-forge/kiln/state.json"
cmp -s CLAUDE.md "$REF/CLAUDE.md"

python3 -I - "$REF" <<'PY'
import json, pathlib, subprocess, sys

ref = pathlib.Path(sys.argv[1])
entries = json.loads((ref / ".rn-forge/kiln/state.json").read_text())["entries"]
fail = []

# Every managed file is the reference's, byte for byte; mkdocs.yml's nav is ngkit's.
for p, e in entries.items():
    if e["kind"] == "managed" and p != "mkdocs.yml":
        if pathlib.Path(p).read_bytes() != (ref / p).read_bytes():
            fail.append(f"managed file differs: {p}")

# Every block is the reference's, byte for byte.
for p, e in entries.items():
    if e["kind"] != "block":
        continue
    path, name = p.split("#")
    begin, end = ("<!-- BEGIN " + name + " -->", "<!-- END " + name + " -->") if path.endswith(".md") \
        else ("# BEGIN " + name, "# END " + name)
    def block(t):
        return t[t.index(begin): t.index(end) + len(end)]
    if block(pathlib.Path(path).read_text()) != block((ref / path).read_text()):
        fail.append(f"block differs: {p}")

# The derived regions kiln fills are there.
for page, fence in [("docs/specs/index.md", "board"), ("docs/specs/epics/index.md", "epics")]:
    if f"<!-- BEGIN derived {fence} -->" not in pathlib.Path(page).read_text():
        fail.append(f"no derived {fence} in {page}")
for page in sorted(pathlib.Path("docs/releases").glob("release-*/index.md")):
    if "<!-- BEGIN derived scope -->" not in page.read_text():
        fail.append(f"no derived scope in {page}")

# Every changed or new path is one a step names: kiln's files, or the list below.
named = {
    ".rn-forge/kiln/config.toml", ".rn-forge/kiln/state.json", "CLAUDE.md",
    ".python-version", "pyproject.toml", "uv.lock", "nx.json",
    ".github/workflows/release.yml", "docs/architecture/ci-template.md",
    "docs/architecture/index.md", "docs/architecture/release-pipeline.md",
    "docs/specs/epics/E11-workspace-generators/F11.1-ng-plugin.md",
    "docs/specs/ideas/index.md",
}
named |= {p.split("#")[0] for p in entries}
out = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"],
                     capture_output=True, text=True, check=True).stdout
for line in out.splitlines():
    p = line[3:]
    if p in named or p.startswith("tools/ci/"):
        continue
    fail.append(f"changed by no step: {line}")

if fail:
    print("\n".join(fail))
    sys.exit(1)
PY
