#!/usr/bin/env node
// ci-template: repository-agnostic. Reads only the declarations in docs/architecture/ci-template.md.
/**
 * Fails when a template-owned file (one carrying the marker above) contains a
 * repository-specific value. Files under `docs/` are never template files, even
 * when they quote the marker.
 *
 * Forbidden tokens: Nx project names, roots and root `package.json` names; the
 * repository name (`GITHUB_REPOSITORY`, else the workspace directory name);
 * `nx.json#nxCloudId`; the `.nvmrc` value; the pnpm version in
 * `package.json#packageManager`; `sonar.projectKey` and `sonar.organization`.
 * A token matches only as a whole token (bounded by line start/end or a
 * character outside `[A-Za-z0-9_@./-]`).
 *
 * Prints the marked files, then `file:line: token` per hit on stderr.
 *
 * Usage: node check-template.mjs   (run from the workspace root)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const root = process.cwd();
const MARKER = 'ci-template: repository-agnostic';

const run = (cmd, args) =>
  execFileSync(cmd, args, {
    cwd: root,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
const nx = (...args) => JSON.parse(run('pnpm', ['exec', 'nx', ...args]));
const readText = (path) =>
  existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf-8') : '';
const readJson = (path) => {
  const text = readText(path);
  return text ? JSON.parse(text) : {};
};

const marked = run('git', [
  'ls-files',
  '--cached',
  '--others',
  '--exclude-standard',
])
  .split('\n')
  .filter((f) => f && !f.startsWith('docs/'))
  .filter((f) => {
    try {
      return readText(f).includes(MARKER);
    } catch {
      return false;
    }
  })
  .sort();

console.log('Template files:');
for (const f of marked) console.log(`  ${f}`);

const tokens = new Set();
for (const project of nx('show', 'projects', '--json')) {
  tokens.add(project);
  const projectRoot = nx('show', 'project', project, '--json').root;
  if (projectRoot && projectRoot !== '.') {
    tokens.add(projectRoot);
    tokens.add(readJson(join(projectRoot, 'package.json')).name);
  }
}
tokens.add(readJson('package.json').name);

const repository = process.env.GITHUB_REPOSITORY;
if (repository) {
  tokens.add(repository);
  tokens.add(repository.split('/').pop());
} else {
  tokens.add(basename(root));
}

tokens.add(readJson('nx.json').nxCloudId);
tokens.add(readText('.nvmrc').trim());
tokens.add(
  readJson('package.json').packageManager?.match(/^pnpm@([^+]+)/)?.[1],
);
const sonar = readText('sonar-project.properties');
for (const key of ['sonar.projectKey', 'sonar.organization']) {
  tokens.add(
    sonar
      .match(new RegExp(`^${key.replace('.', '\\.')}\\s*=\\s*(.*)$`, 'm'))?.[1]
      ?.trim(),
  );
}
tokens.delete(undefined);
tokens.delete('');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchers = [...tokens].map((token) => ({
  token,
  re: new RegExp(`(^|[^A-Za-z0-9_@./-])${escape(token)}($|[^A-Za-z0-9_@./-])`),
}));

let hits = 0;
for (const file of marked) {
  readText(file)
    .split(/\r?\n/)
    .forEach((line, i) => {
      for (const { token, re } of matchers) {
        if (re.test(line)) {
          console.error(`${file}:${i + 1}: ${token}`);
          hits++;
        }
      }
    });
}

if (hits > 0) process.exit(1);
console.log(
  `No repository-specific values in ${marked.length} template files.`,
);
