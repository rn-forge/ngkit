# specs/ — what belongs here

## Belongs here

- Every piece of ngkit work as an epic, `epics/E<n>-<slug>/index.md`, done work
  included.
- A feature of an unfinished epic as `F<n>.<m>-<slug>.md` beside it, holding its
  stories inline as `S<n>.<m>.<k>` headings, each with its own `**Status:**` and
  `**Acceptance:**`.
- A done epic that predates this taxonomy keeps its features as rows in its index,
  each with the commit that delivered it.
- Design for unbuilt work, in the feature's `## Design`, or `design.md` in the epic
  when it spans features.
- Open questions, in `## Open questions` on the epic or feature they block.
- Work that is real but not scheduled, as a `deferred` epic with entry criteria. Its
  items are rows until promoted; their design can sit under `## Design`.

## Does not belong here

| Instead of                          | Put it in                     |
| ----------------------------------- | ----------------------------- |
| Behavior that already exists        | `architecture/`               |
| A decision                          | an ADR under `adr/`           |
| Which stories ship in which release | `releases/`, which links here |
| History and evidence                | the commit message            |

## Naming and status

- IDs are permanent. Never renumber; a moved story keeps its ID; gaps are fine.
  Retired work is removed and its ID is never reused.
- Epic and feature status is one of: `elaborating` (agreed; stories, design or
  release not settled), `planned` (stories written and assigned to a release),
  `in progress` (at least one story started), `done` (every story's acceptance
  holds; carries `**Implemented:**` with the date and commits), `deferred` (not
  scheduled; carries `**Entry criteria:**`).
- Story status is `planned`, `in progress` or `done (<date>)`. A story in a deferred
  epic is `deferred`.
- `done` means implemented. It does not mean released; the release pages record
  that.
- `**Owner:**` is `ngkit`.
- `**Source:**`, when present, names the owner decision and its date, or the former
  roadmap item the epic came from.

## Writing acceptance

- A story's `**Acceptance:**` lists observable results, including the tests that
  prove it.
- Every result is checkable inside this repository. Acceptance that needs a host,
  such as a consumer app or a backend, builds it here, as `ng:verify-consumer` does
  for consumer apps.
- A decision the work needs is its own story, so other work can depend on the
  decision alone.
- A feature with several stories may have a `## Acceptance` block that tags each line
  with the story it proves. Where a line can be scripted, the block is a shell script
  that starts with `set -euo pipefail` and never turns a failure into output. A
  negative check uses `absent`, not a bare `! cmd`:

  ```bash
  absent() { local rc=0; rg -q --hidden --glob '!.git' "$@" || rc=$?; [ "$rc" -eq 1 ]; }
  ```

## Other repositories

rn-forge repositories depend on each other the way the shared rn-forge standard, kept
in kiln, describes: a requirement one repository has of another is stated in the
depending repository's own terms and met through a released version or pinned ref.

- A dependency on another repository's software is a version or git pin in the
  manifest of the code that uses it, plus at most an entry criterion that can be
  observed from outside that repository ("a release that exposes
  `Content-Disposition` to cross-origin callers").
- Another repository's pages, paths, spec IDs and internal status are not cited or
  restated. A finding that came from elsewhere is written here in full.
- No page here is written for another repository to cite.

## Changing this area

**Adding work:** take the next free ID; create the epic with its status; put design
at the lowest level that fits; add the epic's row to the board in `index.md`, in
exactly one group.

**Closing work:** a story is done when its acceptance holds. When every story is
done, set the feature and then the epic to `done` with `**Implemented:**`, and move
the board row. An answered open question becomes an ADR, or a rejected option under
`## Considered and rejected`; then remove the question.

**Deferred work:** don't start or elaborate a deferred epic unless the owner asks.
When its entry criteria hold, it becomes `elaborating`, then `planned`. Nothing
renumbers.
