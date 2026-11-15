"""Exact-once text edits that ignore line wrapping, for the cutover's scripts.

Usage: python3 -I edits.py <edits.json>, a list of [path, old, new]. The old text
matches with any run of whitespace where it has one, so a page mdformat rewrapped
still matches; it must occur exactly once. Nothing is written unless every edit
matches. `task format` rewraps the new text afterwards.
"""

import json
import pathlib
import re
import sys


def pattern(old: str) -> re.Pattern[str]:
    words = old.split()
    body = r"\s+".join(re.escape(w) for w in words)
    # keep a leading or trailing newline in the old text as part of the match
    lead = r"\n" if old.startswith("\n") else ""
    trail = r"\n" if old.endswith("\n") else ""
    return re.compile(lead + body + trail)


def main() -> None:
    edits = json.loads(pathlib.Path(sys.argv[1]).read_text())
    texts: dict[str, str] = {}
    for path, old, new in edits:
        text = texts.get(path)
        if text is None:
            text = pathlib.Path(path).read_text()
        found = pattern(old).findall(text)
        if len(found) != 1:
            sys.exit(f"FAIL {path}: expected one match, found {len(found)}: {old[:70]!r}")
        texts[path] = pattern(old).sub(lambda _: new, text, count=1)
    for path, text in texts.items():
        pathlib.Path(path).write_text(text)


if __name__ == "__main__":
    main()
