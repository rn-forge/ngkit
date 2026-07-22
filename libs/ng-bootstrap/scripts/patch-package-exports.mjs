// ng-packagr computes `exports` in dist/package.json from compiled entry
// points only, so it has no way to know about `assets/` (plain Sass files,
// not a compiled entry point — see assets/README.md). This patches the
// subpath in after the fact.
//
// This must NOT be added to the source package.json directly: doing so
// makes Node's exports algorithm enforce a fully-declared map during local
// dev too (via the pnpm workspace symlink), and since source has no
// compiled "." target to point to, that breaks every subpath import,
// including this one.
import { readFileSync, writeFileSync } from 'node:fs';

const pkgPath = 'dist/libs/ng-bootstrap/package.json';
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

pkg.exports = { './assets/*': './assets/*', ...pkg.exports };

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
