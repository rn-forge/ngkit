#!/usr/bin/env bash
# S17.2.11: ngkit's spec and release pages take kiln's derived regions (F17.1 S17.1.2 to
# S17.1.4), filled by `task docs:generate`; write the result as a patch.
# Usage, from the repository root: bash <this file> <patch-path>   (outside the repository)
# Overlays S17.2.1 steps 01 to 04, converts, generates, formats, and stops.
# It resets and cleans nothing.
set -euo pipefail
PATCH="${1:?usage: derive.sh <patch-path>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case "$(cd "$(dirname "$PATCH")" && pwd)/" in "$PWD"/*) echo "patch must be outside the repository" >&2; exit 1 ;; esac

test "$(basename "$PWD")" = ngkit
test "$(git branch --show-current)" = feature/kiln-cutover
test "$(git log -1 --format=%s)" = S17.2.10
test -z "$(git status --porcelain)"

# ngkit's own specs/_structure.md, before step 01 replaces it with kiln's.
git show HEAD:docs/specs/_structure.md >"$PATCH.structure"
for step in 01-managed 02-config 03-blocks 04-seeded; do
  bash "$HERE/steps/$step.sh" >/dev/null
done
git status --porcelain >"$PATCH.overlay"
task setup

# 1. The fences and the page shapes kiln reads. The removed hand-written Scope
# tables are saved beside the patch, to compare with the derived ones.
python3 -I - "$PATCH.structure" "$PATCH.removed" <<'PY'
import pathlib
import re
import sys

structure = pathlib.Path(sys.argv[1]).read_text()
removed_log = pathlib.Path(sys.argv[2])
removed: list[str] = []
docs = pathlib.Path("docs")


def once(text: str, old: str, new: str, where: str) -> str:
    assert text.count(old) == 1, (where, old[:60])
    return text.replace(old, new)


def section(text: str, heading: str) -> str:
    """The body of a `## ` section, up to the next `## ` heading or the end."""
    m = re.search(rf"^## {re.escape(heading)}\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    assert m, heading
    return m.group(1).strip("\n")


# docs/specs/index.md (S17.1.3, S17.1.4): the Board becomes kiln's derived board, with
# kiln's sentence about it and the links to the epic and ideas lists; Conventions point
# at kiln's _structure.md; ngkit's own rules move under "How this repository differs".
page = docs / "specs/index.md"
text = page.read_text()
a = text.index("## Board\n")
b = text.index("## Conventions\n")
text = (
    text[:a]
    + "The Releases and Backlog sections below are derived from the epic, feature and\n"
    "release pages by `task docs:generate`; never edit inside their fence.\n\n"
    "<!-- BEGIN derived board -->\n\n<!-- END derived board -->\n\n"
    "Ideas not yet agreed as work are parked in the [ideas list](ideas/index.md).\n\n"
    "Every epic, by number, is on [the epic list](epics/index.md).\n\n"
    "## Conventions\n\n"
    "The work model is kiln's, in `docs/specs/_structure.md`.\n\n"
    "## How this repository differs\n\n"
    + section(structure, "Other repositories")
    + "\n\n"
    + re.search(r"^\*\*Checking removed behaviour:\*\*.*?(?=\n\n)", structure, re.S | re.M).group(0)
    + "\n"
)
page.write_text(text)

# Release pages (S17.1.3): the status line becomes kiln's metadata table, and the
# first table under Scope becomes the derived scope region.
for page in sorted((docs / "releases").glob("release-*/index.md")):
    text = page.read_text()
    m = re.search(r"^\*\*Status:\*\* (shipped|in progress) \((?:since )?(\d{4}-\d\d-\d\d)\)\n", text, re.M)
    assert m, page
    status, date = m.groups()
    key = "Finish Date" if status == "shipped" else "Start Date"
    table = f"| | |\n| -- | -- |\n| **Status** | {status} |\n| **{key}** | {date} |\n"
    text = text[: m.start()] + table + text[m.end() :]
    lines = text.split("\n")
    s = lines.index("## Scope")
    t0 = next(i for i in range(s + 1, len(lines)) if lines[i].startswith("|"))
    assert all(not lines[i].startswith("## ") for i in range(s + 1, t0)), page
    t1 = next(i for i in range(t0, len(lines)) if not lines[i].startswith("|"))
    removed.append(f"{page.as_posix()}:\n" + "\n".join(lines[t0:t1]))
    lines[t0:t1] = ["<!-- BEGIN derived scope -->", "", "<!-- END derived scope -->"]
    page.write_text("\n".join(lines))

# Features (S17.1.2): kiln wants a Predecessors row; the seven without one have none.
# Kiln's key order puts it after Closed Date and before Source and Entry criteria.
after = ("| **Source** |", "| **Entry criteria** |")
for page in sorted((docs / "specs/epics").glob("E*/F*.md")):
    lines = page.read_text().split("\n")
    t0 = next(i for i, l in enumerate(lines) if l.startswith("|"))
    t1 = next(i for i in range(t0, len(lines)) if not lines[i].startswith("|"))
    if any(l.startswith("| **Predecessors** |") for l in lines[t0:t1]):
        continue
    at = next((i for i in range(t0 + 2, t1) if lines[i].startswith(after)), t1)
    lines.insert(at, "| **Predecessors** | — |")
    page.write_text("\n".join(lines))
    print("predecessors:", page.as_posix())

# F11.1 is New with a Closed story (S11.1.6, the decision): kiln's rule makes it
# Active, and its epic E11 with it; an Active epic needs a Start Date, the decision's.
for page, new in (
    ("docs/specs/epics/E11-workspace-generators/F11.1-ng-plugin.md", "| **State** | Active |\n"),
    ("docs/specs/epics/E11-workspace-generators/index.md",
     "| **State** | Active |\n| **Start Date** | 2026-10-17 |\n"),
):
    page = pathlib.Path(page)
    page.write_text(once(page.read_text(), "| **State** | New |\n", new, page))

removed_log.write_text("\n\n".join(removed) + "\n")
PY

# 2. ADR-0007 (S17.1.4): the docs are also a site, and links are checked.
edits="$(mktemp)"
trap 'rm -f "$edits"' EXIT
cat >"$edits" <<'JSON'
[
  ["docs/adr/ADR-0007.md",
   "The docs are plain Markdown read on GitHub; there is no docs site build.",
   "The docs are plain Markdown read on GitHub. Amended 2026-11-02: they are also built as a MkDocs site (`task docs:build`), published once with Compodoc and Storybook under it."],
  ["docs/adr/ADR-0007.md",
   "Nothing checks links automatically; moving a page means checking its links by hand.",
   "`kiln doctor` and `mkdocs --strict` check links and anchors."]
]
JSON
python3 -I "$HERE/edits.py" "$edits"

# 3. Generate until nothing changes: a second run leaves the tree as the first left it.
task docs:generate
task format
task docs:generate
before="$(git diff | shasum -a 256)"
task docs:generate
test "$(git diff | shasum -a 256)" = "$before" || { echo "docs:generate is not idempotent" >&2; exit 1; }

# Only Markdown under docs/, and nothing on the overlay list.
sed 's/^...//' "$PATCH.overlay" >"$PATCH.overlay-paths"
paths=()
while IFS= read -r path; do
  paths+=("$path")
done < <(git diff --name-only -- 'docs/*.md' | grep -vxF -f "$PATCH.overlay-paths" || true)
rm "$PATCH.overlay-paths" "$PATCH.structure"
test "${#paths[@]}" -gt 0 || { echo "no spec page changed" >&2; exit 1; }

git diff -- "${paths[@]}" >"$PATCH"
printf '%s\n' "${paths[@]}"
echo "${#paths[@]} files in $PATCH; overlay paths in $PATCH.overlay; removed Scope tables in $PATCH.removed"
