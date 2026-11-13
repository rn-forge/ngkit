#!/usr/bin/env bash
# S17.2.1 step 6: nx.json's pack and verify-dist call kiln's `ci:dist:*` tasks, the
# reference's commands, since step 5 deleted the tools/ci helpers. The rest of nx.json
# is ngkit's (nxCloudId, plugins, generators); S17.5.1 takes the reference's file whole.
set -euo pipefail
python3 -I - <<'PY'
import pathlib
p = pathlib.Path("nx.json")
text = p.read_text()
edits = [
    ("node tools/ci/resolve-dist-workspace-deps.mjs dist/{projectRoot}/package.json && ",
     "task ci:dist:resolve -- dist/{projectRoot} && "),
    ("node tools/ci/verify-dist-manifest.mjs dist/{projectRoot}",
     "task ci:dist:verify -- dist/{projectRoot}"),
]
for old, new in edits:
    assert text.count(old) == 1, old
    text = text.replace(old, new)
p.write_text(text)
PY
grep -qF '"command": "task ci:dist:resolve -- dist/{projectRoot} && mkdir -p dist/tarballs && npm pack ./dist/{projectRoot} --pack-destination dist/tarballs"' nx.json
grep -qF '"command": "task ci:dist:verify -- dist/{projectRoot}"' nx.json
