#!/usr/bin/env bash
# S17.2.1 step 3: the files that hold a kiln block, and the instruction files (F17.3).
set -euo pipefail
REF="${REF:-$PWD/../_reference/ngkit}"
python3 -I - "$REF" <<'PY'
import pathlib, shutil, sys

ref = pathlib.Path(sys.argv[1])


def block(text, begin, end):
    assert text.count(begin) == 1 and text.count(end) == 1, begin
    a = text.index(begin)
    b = text.index(end) + len(end)
    return a, b


# .gitignore: the reference's file (uv and Nx preambles, then the block), with
# ngkit's own lines inserted before the block. ngkit's other lines are covered
# by the preambles or the block.
text = (ref / ".gitignore").read_text()
a, b = block(text, "# BEGIN rn-forge kiln", "# END rn-forge kiln")
assert not text[b:].strip(), "text after the .gitignore block"
ngkit_lines = (
    "# ngkit: Nx Cloud scratch, Storybook and Compodoc output, the Django fixture's database\n"
    ".nx/polygraph\n"
    "storybook-static\n"
    "documentation.json\n"
    "*.sqlite3\n"
    "*.sqlite3-journal\n"
    "\n"
)
pathlib.Path(".gitignore").write_text(text[:a] + ngkit_lines + text[a:])

# .prettierignore: the reference's file whole. ngkit's own lines (/dist, /coverage,
# /.nx/cache, /.nx/workspace-data, pnpm-lock.yaml, README.md, .venv) are all in the block.
shutil.copyfile(ref / ".prettierignore", ".prettierignore")

# AGENTS.md is the instructions plus kiln's block; CLAUDE.md is the reference's
# `@AGENTS.md` pointer. ngkit's instructions (the Nx-managed section and the project
# guidelines) are its CLAUDE.md today; its AGENTS.md is a pointer to CLAUDE.md.
rtext = (ref / "AGENTS.md").read_text()
a, b = block(rtext, "<!-- BEGIN rn-forge kiln -->", "<!-- END rn-forge kiln -->")
mine = pathlib.Path("CLAUDE.md").read_text()
assert "BEGIN rn-forge kiln" not in mine
assert "Read `CLAUDE.md` now" in pathlib.Path("AGENTS.md").read_text()
pathlib.Path("AGENTS.md").write_text(mine.rstrip("\n") + "\n\n" + rtext[a:b] + "\n")
shutil.copyfile(ref / "CLAUDE.md", "CLAUDE.md")
PY
