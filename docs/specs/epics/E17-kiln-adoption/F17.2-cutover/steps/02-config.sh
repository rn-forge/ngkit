#!/usr/bin/env bash
# S17.2.1 step 2: the config holds ngkit-new.toml's values. Nothing is edited:
# an edit after the copy would change state.json's config_hash.
set -euo pipefail
c=.rn-forge/kiln/config.toml
grep -qx 'name = "ngkit"' $c
grep -qx 'owner = "rn-forge"' $c
grep -qx 'archetype = "node-lib"' $c
grep -qx 'ref = "feature/v1"' $c
grep -qx 'profile = "mkdocs"' $c
grep -qxF '    "apps/ng-demo-api-fastapi/**",' $c
grep -qxF '    "apps/*/src/app/app.config.ts",' $c
! grep -q '^\[source\]' $c
