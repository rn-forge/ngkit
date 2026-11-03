# specs/ — what belongs here

> **Interim, 2026-11-03 ([S17.1.2](epics/E17-kiln-adoption/F17.1-docs-model.md)).**
> Epic, feature and story pages now follow kiln's work model. Where this file
> describes `**Status:**` lines, `### S…` headings or `**Implemented:**` dates,
> use this instead, until `kiln init` replaces this file with kiln's
> `_structure.md`:
>
> - An epic or feature page opens with its `# ` title, then a metadata table
>   (`| | |` / `| -- | -- |` / `| **State** | New |` …). Keys, in this order,
>   leaving out any that does not apply: epic `State`, `Tags`, `Start Date`,
>   `Closed Date`, `Entry criteria`; feature `State`, `Parent`, `Iteration`,
>   `Tags`, `Start Date`, `Closed Date`, `Predecessors`, `Source`,
>   `Entry criteria`. Values are short, with no trailing period and no commit
>   hash; reasoning that does not fit a cell goes in the feature's
>   `## Context`.
> - States: `New` (agreed, not started; with `Tags` `deferred` and
>   `Entry criteria` when not scheduled; with an `Iteration` once on a
>   release), `Active` (a story started; `Start Date`), `Closed` (every
>   story's acceptance holds; `Closed Date`), `Removed` (retired, kept in
>   place with one line saying why). A feature's release is its `Iteration`.
> - Stories are `## S<n>.<m>.<k> — <Title>` headings, with no `## Stories`
>   heading, each with `**State:** New`, `Active`, `Closed (<date>)` or
>   `Removed`, optionally followed by `· **Depends on:** <IDs>`. Sections:
>   `## Context` and `## Design` before the first story; `## Acceptance`,
>   `## Considered and rejected` and `## Open questions` after the last.
> - The `BEGIN derived …` / `END derived …` fences on epic and feature pages
>   stay empty until `task docs:generate` fills them; never write inside them.
>   Until then, the board in `index.md` and each release page's Scope table
>   stay hand-kept as below.

## Belongs here

- Every piece of work as an epic, `epics/E<n>-<slug>/index.md` — done work
  included, so the tree is the inventory of what this repo is made of.
- An epic's features as `F<n>.<m>-<slug>.md` beside it, each with its own
  `**Status:**` and `**Depends on:**` lines, its stories inline as
  `S<n>.<m>.<k>` headings with their own `**Status:**` line and
  `**Acceptance:**` list, and its `## Acceptance` block
  ([conventions](index.md#conventions)). A feature file, once written, stays
  when its work is done.
- A done epic whose work predates this taxonomy, its specs written after the
  code, keeps its features as rows in its `index.md`, each with the commits
  that delivered it.
- Design for work not yet built: a `## Design` section in the feature it belongs
  to, or `design.md` in the epic when it spans features.
- Open questions, as a `## Open questions` section on the epic or feature they
  block.
- Work that is real but not scheduled, as a `deferred` epic or feature with
  entry criteria.
- Ideas not yet agreed as work, in `backlog.md`: a row each (slug, one-line
  summary, source), with a `##` section under the table only when there is
  more to record. Entries take no ID and no status.

## Does not belong here

| Instead of                                       | Put it in                       |
| ------------------------------------------------ | ------------------------------- |
| Behaviour that already exists                    | `architecture/`                 |
| A decision                                       | an ADR under `adr/`             |
| Which features ship in which release             | `releases/` — it links here     |
| History and evidence                             | the commit message              |
| A `progress.md`, `decisions.md` or `overview.md` | the epic, an ADR, or the README |

## Naming and status

- `epics/E<n>-<slug>/` directories; feature files `F<n>.<m>-<slug>.md`.
- IDs are permanent: never renumber; a moved story keeps its ID. Gaps are fine.
  Work no longer needed is removed and its ID is never reused: a retired story
  is listed on its feature's `**Retired:**` line, a retired feature on its epic's,
  a retired epic on the board.
- Epic and feature status is one of these, and `index.md`'s board lists each
  epic in exactly one group:

| Status        | Means                                                               |
| ------------- | ------------------------------------------------------------------- |
| `elaborating` | Agreed, but its stories or design are not settled.                  |
| `planned`     | Stories written, and in a release.                                  |
| `in progress` | At least one story started.                                         |
| `done`        | Every story's acceptance holds; carries an `**Implemented:**` date. |
| `deferred`    | Not scheduled; carries `**Entry criteria:**`.                       |

- Story status is `planned`, `in progress` or `done (<date>)`. A story in a
  deferred epic or feature is `deferred`.
- `done` means implemented, not released; the release pages record what shipped.
- A feature's status is mirrored on its release page's scope row; a change to
  one is a change to both, in the same commit.
- Status lines appear only on epics, features, stories and releases.
- `**Source:**`, when present, cites a current document, or the owner decision
  and its date.

## Changing this area

**Parking an idea:** add a row to `backlog.md`, and a section linked from the
row if it needs more than a line. Do not elaborate a backlog entry unless the
owner asks. A dropped idea is deleted.

**Adding an epic or a feature:**

1. Take the next free ID. Never renumber a sibling. An idea promoted from the
   backlog carries its section into the new file, and its entry is deleted.
1. Create `epics/E<n>-<slug>/index.md` with its status: `elaborating` while it
   has no stories, `planned` once it has stories and a release, or `deferred`
   with entry criteria.
1. Write one feature file per feature, stories inline. Give a story its own file
   only when its acceptance runs past about a screen.
1. Put design at the lowest level that fits: the feature's `## Design`; the
   epic's `design.md` when it spans features; a link to `architecture/` when
   it describes current behaviour.
1. Add the epic's row to the board in `index.md`, in exactly one group, and run
   `task docs:nav`.

**Writing acceptance:**

- Each line is an observable result, and the tests that prove a story belong in
  its acceptance, not in a story of their own.
- A decision the work needs is its own story, so other work can depend on the
  decision without depending on its implementation.
- A feature with several stories has a `## Acceptance` block that exercises
  every story, each line tagged with the story it proves; a one-story feature
  keeps its acceptance on the story. What cannot be scripted, such as an
  approval, is listed under the block.
- The block fails loudly: `set -euo pipefail`, never `|| echo`, and negative
  checks through these helpers rather than a bare `! cmd`, which `set -e`
  ignores:

```bash
absent() { local rc=0; rg -q --hidden --glob '!.git' "$@" </dev/null || rc=$?; [ "$rc" -eq 1 ]; }
fails_with() { local out rc=0; out=$("${@:2}" 2>&1) || rc=$?; [ "$rc" -ne 0 ] && grep -qF -- "$1" <<<"$out"; }
```

**Checking removed behaviour:** a check that a removed symbol is gone asks "does
any current page describe it as present?", not "does the name appear?". A page
may name removed behaviour to say it is gone.

**Working on and closing out work:**

1. Starting: flip the feature, and the epic, to `in progress`, on the feature's
   release row too, and move the epic's board row.
1. A story is `done` when its acceptance holds; run the feature's acceptance
   block, then flip the story's status.
1. When every story is done, the feature is `done` with its `**Implemented:**`
   date, on its release row too. When every feature is done, the epic is
   `done` with its `**Implemented:**` date and the acceptance as run, and its
   board row moves to Done. Done work is never deleted.
1. An answered open question becomes an ADR, or a rejected option recorded on
   the feature under _Considered and rejected_; the question is then removed.

**Deferred work:** do not start or elaborate a deferred epic or feature unless
the owner asks. When its entry criteria hold it becomes `elaborating`, then
`planned` with a release. Nothing renumbers.

## Other repositories

- Every acceptance line is checkable inside this repository. When acceptance
  needs a host, such as an application or a library workspace, a test builds
  one in a temporary directory.
- A dependency on another repository's software is a version or git pin in the
  manifest of the code that uses it, plus at most an entry criterion that can
  be observed from outside that repository ("its release-1 tags exist").
- Another repository's pages, paths, spec IDs and internal status are not cited
  or restated. A requirement or finding that came from elsewhere is written
  here in full, as this repository's own. The exception is kiln, which owns
  repository-level setup: its specs and ADRs may be cited by ID as the reason
  work here is retired or out of scope ([ADR-0007](../adr/ADR-0007.md)).
- No page here is written for another repository to cite.
