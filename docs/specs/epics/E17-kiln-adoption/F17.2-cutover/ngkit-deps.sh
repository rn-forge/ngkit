#!/usr/bin/env bash
# Give the reference ngkit's projects and root dependencies. Run in the reference's root.
# Usage: ngkit-deps.sh <ngkit package.json>
# The dependency lists are read from ngkit's package.json, at their exact ranges.
# Not made: ng-demo-api and ng-demo-api-fastapi (Python, no Nx generator) and
# ng-tailwind-e2e (no standalone e2e generator). No tags are passed.
set -euo pipefail
PKG="$(cd "$(dirname "${1:?usage: ngkit-deps.sh <package.json>}")" && pwd)/$(basename "$1")"

for n in ng ng-bootstrap ng-tailwind; do
  pnpm nx g @nx/angular:library "libs/$n" --name="$n" --prefix=rnf --publishable \
    --importPath="@rn-forge/$n" --unitTestRunner=vitest-angular --linter=eslint \
    --interactive=false
  pnpm exec nx lint "$n" --fix
done
pnpm nx g @nx/angular:application apps/ng-demo --name=ng-demo --prefix=app \
  --style=scss --unitTestRunner=vitest-angular --linter=eslint \
  --e2eTestRunner=playwright --interactive=false

specs() { node -e 'const d = require(process.argv[1])[process.argv[2]] || {};
  for (const [k, v] of Object.entries(d)) console.log(`${k}@${v}`);' "$PKG" "$1"; }
deps=() dev=()
while IFS= read -r s; do deps+=("$s"); done < <(specs dependencies)
while IFS= read -r s; do dev+=("$s"); done < <(specs devDependencies)
test "${#deps[@]}" -gt 0 && test "${#dev[@]}" -gt 0
pnpm add "${deps[@]}"
pnpm add -D "${dev[@]}"
