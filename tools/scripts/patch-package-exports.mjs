// ng-packagr computes `exports` in dist/package.json from compiled entry
// points only, so it has no way to know about plain assets (Sass or CSS
// files, not compiled entry points). This patches extra subpaths in after
// the fact.
//
// Usage: node tools/scripts/patch-package-exports.mjs <projectRoot> <subpath>=<target>...
//   e.g. libs/ng-bootstrap './assets/*=./assets/*'
//
// This must NOT be added to the source package.json directly: doing so
// makes Node's exports algorithm enforce a fully-declared map during local
// dev too (via the pnpm workspace symlink), and since source has no
// compiled "." target to point to, that breaks every subpath import,
// including these.
import { readFileSync, writeFileSync } from 'node:fs';

const [projectRoot, ...pairs] = process.argv.slice(2);
if (!projectRoot || pairs.length === 0) {
  console.error(
    'usage: patch-package-exports.mjs <projectRoot> <subpath>=<target>...',
  );
  process.exit(1);
}

const added = Object.fromEntries(pairs.map((p) => p.split('=')));
const pkgPath = `dist/${projectRoot}/package.json`;
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

pkg.exports = { ...added, ...pkg.exports };

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
