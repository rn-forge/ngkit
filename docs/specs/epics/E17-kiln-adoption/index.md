# E17 — kiln adoption

|  |  |
| -- | -- |
| **State** | Active |
| **Start Date** | 2026-11-03 |

**Release:** [Release 3](../../../releases/release-3/index.md)

**Source:** owner decision, 2026-11-02: ngkit adopts
[kiln](https://github.com/rn-forge/kiln)'s `node-lib` archetype, and its docs
take the work model every rn-forge repository uses. kiln's labelled comparison
of its rendered CI against ngkit's files was approved the same day; the owner
reviews the applied change again at the cutover (S17.2.4).

ngkit moves onto kiln's `node-lib` archetype, so that its CI, task surface and
docs tooling are generated and checked like every other rn-forge repository, and
ngkit stops carrying its own copies. [E13](../E13-portable-ci/index.md) built
ngkit's CI as a repository-agnostic template; kiln now renders that template, so
the template files, the `template` job that checks them and the page that
describes them retire. ngkit keeps what is its own: `nx.json`, project targets
and tags, `.nvmrc`, `packageManager`, Sonar's project settings and every
library. Acceptance is checked inside ngkit; what needs GitHub is listed under
each acceptance block.

[Back to the board](../../index.md)

<!-- BEGIN derived features -->

<!-- END derived features -->

**Order.** The cutover runs on `feature/kiln-cutover`, cut from and merged back
into `feature/release-3`, before kiln's release tag, with
`[kiln] ref = "feature/v1"` (owner decision, recorded in
[kiln S7.2.4](https://github.com/rn-forge/kiln/blob/main/docs/specs/epics/E7-pykit-release-pin-flip/F7.2-kiln-release-and-config-upgrade.md)).
First the pre-cutover stories, which need no kiln and are safe on ngkit's
current CI, each committed:
[S17.2.6](F17.2-cutover.md#s1726-upgrade-nx-to-kilns-pin) (Nx),
[S17.1.5](F17.1-docs-model.md#s1715-links) (links),
[S17.2.7](F17.2-cutover.md#s1727-prose-that-is-true-before-and-after-the-cutover)
(prose) and [S17.2.9](F17.2-cutover.md#s1729-upgrade-pnpm-to-kilns-pin) (pnpm).
Then [S17.2.10](F17.2-cutover.md#s17210-format-to-kilns-formatters-ahead-of-the-overlay)
formats ngkit's own Markdown, TOML and YAML on `feature/kiln-format`. Then
[S17.2.1](F17.2-cutover.md#s1721-overlay-the-kiln-reference), the one cutover
story: an overlay of a `kiln new` reference, a numbered list with commands and
expected exit codes, run on the working tree and committed at the end in path
groups, docs first (only the last commit has to pass `task validate`). Then the
rest of F17.1, then S17.2.3 to S17.2.5. After kiln tags `v0.1.0`,
[S17.2.8](F17.2-cutover.md#s1728-pin-kilns-release-tag) moves the pin to the
tag. The branch merges once both features' acceptance holds.
[F11.1](../E11-workspace-generators/F11.1-ng-plugin.md) waits on this epic's
merge.

## Decisions

- **Cut over before kiln's tag (owner decision, 2026-11-07).** ngkit and pykit
  cut over on kiln's branch so that kiln keeps being refined from their
  findings; the tag follows and each repository bumps its ref and runs
  `kiln apply`. The cutover is deterministic: pre-cutover stories first, then
  one cutover story (F17.2; an overlay). Nx moves to kiln's
  pinned `24.0.4` before the cutover (S17.2.6), because kiln's Nx never
  reaches an adopted repository and `pnpm audit` fails on the older Angular
  and Nx dependency tree.
- **Release:** Release 3, because
  [Release 3](../../../releases/release-3/index.md) already says F11.1 is
  picked up after ngkit is cut over to kiln. Assumed 2026-11-02; the owner
  moves it if wrong.
- **Retired by the cutover, not open:** the older-major hotfix line. ADR-0003
  has hotfixes cut from `release/<major>.x` with `dist-tag: v<major>-lts`;
  kiln releases from the default branch only (owner decision in kiln,
  2026-10-29), and ngkit has no `release/**` branch. S17.2.3 retires the rule
  in ADR-0003, the runbook and `CLAUDE.md`; a hotfix line becomes a new ADR
  when one is needed.
- **Not open:** the Pages site becomes MkDocs with Compodoc under `api/` and
  Storybook under `storybook/`; `USE_NX_CLOUD` is set to `true`; Sonar
  exclusions live in `.rn-forge/kiln/config.toml`; the release is a `release`
  job on a push to `main` (kiln's S15.8.5). Each is a consequence of the owner's approval above,
  and each is a story's Build, not a question.

## Considered and rejected

- **Keep the CI hand-managed as a template.** [E13](../E13-portable-ci/index.md)
  made the files portable, but copying them into a second repository is
  exactly what drifts. kiln renders the same files and checks them, so ngkit's
  copy would be a second source of the same content.
- **Convert the docs after the cutover.** The generated gate (`task validate`)
  fails on the findings `kiln doctor --full` reports on ngkit's unconverted
  docs, so the cutover could not pass its own acceptance first. The docs
  conversion comes straight after the overlay, before anything in CI is
  reviewed.
- **Fix the 26 broken anchors by hand and leave the rest of the docs
  structure.** ngkit would then keep a second spec structure that no other
  rn-forge repository reads. One structure everywhere is the point.

## Acceptance

E17 is done when both features' acceptance blocks pass. This block re-proves the
epic end to end after the cutover branch has merged.

```bash
set -euo pipefail
absent() { local rc=0; rg -q --hidden --glob '!.git' "$@" </dev/null || rc=$?; [ "$rc" -eq 1 ]; }
task validate
kiln doctor . --full
test ! -e docs/architecture/ci-template.md
test ! -e tools/ci/check-template.mjs
absent 'ci-template' .github tools nx.json
absent 'architecture/ci-template' docs/architecture docs/guides docs/runbooks docs/adr docs/releases docs/specs/epics/E11-workspace-generators CLAUDE.md README.md
grep -q '^archetype = "node-lib"' .rn-forge/kiln/config.toml
```

Not scriptable, checked on GitHub: a pull-request run where `ci-ok` passes, a
push to `main` that deploys the docs site and whose `release` job logs its
mode (F17.2).
