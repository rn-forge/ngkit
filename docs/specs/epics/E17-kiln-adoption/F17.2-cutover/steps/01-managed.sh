#!/usr/bin/env bash
# S17.2.1 step 1: every `managed` file of the reference's state.json, byte for byte,
# then state.json, config.toml. mkdocs.yml's nav is re-derived in step 10.
set -euo pipefail
REF="${REF:-$PWD/../_reference/ngkit}"
python3 -I - "$REF" <<'PY'
import json, pathlib, shutil, sys
ref = pathlib.Path(sys.argv[1])
entries = json.loads((ref / ".rn-forge/kiln/state.json").read_text())["entries"]
managed = sorted(p for p, e in entries.items() if e["kind"] == "managed")
assert len(managed) == 30, len(managed)
for p in managed:
    dst = pathlib.Path(p)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ref / p, dst)
    print("copied", p)
PY
cp "$REF/.rn-forge/kiln/state.json" .rn-forge/kiln/state.json
cp "$REF/.rn-forge/kiln/config.toml" .rn-forge/kiln/config.toml
