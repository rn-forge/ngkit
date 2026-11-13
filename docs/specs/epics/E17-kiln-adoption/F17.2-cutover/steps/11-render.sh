#!/usr/bin/env bash
# S17.2.1 step 11: render. kiln:apply changes no managed file or block, and config.toml
# and state.json stay the reference's, byte for byte.
set -euo pipefail
REF="${REF:-$PWD/../_reference/ngkit}"
task kiln:diff
task kiln:apply
cmp .rn-forge/kiln/config.toml "$REF/.rn-forge/kiln/config.toml"
cmp .rn-forge/kiln/state.json "$REF/.rn-forge/kiln/state.json"
