# docs/ — what belongs here

The rules for the tree as a whole: which area a statement belongs in, and where new
material goes. `docs/index.md` is the reader's entry point; this file is the
agent's. They are not copies of each other.

## Areas

Declared in `_areas.yml`, in reading order.

| Area            | Holds                                                            |
| --------------- | ---------------------------------------------------------------- |
| `architecture/` | How the libraries and the repository are put together now.       |
| `guides/`       | How to build an app on ngkit, and how to develop ngkit.          |
| `runbooks/`     | Procedures with decision points, such as releasing.              |
| `reference/`    | Pointers to the generated API reference and component catalog.   |
| `releases/`     | What each release carries, by story ID.                          |
| `specs/`        | Work: epics, features, stories, their design and open questions. |
| `adr/`          | Choices between real alternatives.                               |

Every area's rules live in its own `_structure.md`; this file only lists them.
Routing files (`_*.md`, `_areas.yml`) are for maintainers and agents; pages don't
link to them.

## Where new material goes

- Behavior as it is now → `architecture/`, or `guides/` if it is about using or
  developing ngkit. Never duplicated into a spec.
- How to use one entry point → that entry point's `README.md` under `libs/`. It ships
  in the package, so its links are absolute. The generated API reference comes from
  doc comments.
- A choice between real alternatives → a new ADR under `adr/`; a change to one → that
  ADR, revised in place.
- Work to do, or a record of work done → an epic under `specs/epics/`.
- What ships when → `releases/`.
- A procedure with judgement calls → `runbooks/`.
- An open question → the epic or feature it blocks, until it becomes an ADR or a
  rejected option recorded there.
- History, evidence, what a review changed → the commit message.

## Self-contained

These docs describe only this repository. A requirement that came from another
repository or from a surveyed application is written here in full, as ngkit's own,
without naming its source. Pages don't link to or cite paths in other repositories.
`specs/_structure.md` says how a dependency on another repository is written.

## Checks

Nothing enforces this tree automatically yet. `pnpm exec prettier --check docs`
checks formatting. When moving a page, check the links to it by hand.

## Keeping it honest

Check for these when changing the tree, and report what you find rather than fixing
it silently; some of it is deliberate:

- A release names a story ID that does not exist, or a planned story is in no
  release.
- An epic's status contradicts its stories, or its board row is in the wrong group,
  or in two.
- Two ADRs decide the same topic, or an ADR's Decision changed
  (`git log --follow docs/adr/ADR-<nnnn>.md`) with no Background entry saying so.
- Design prose collecting in a top-level page instead of under its feature.
- A `progress.md`, `backlog.md`, `decisions.md` or `overview.md` has appeared; each
  restates what the epics, deferred epics, ADRs or README already own.
- `README.md`, `CLAUDE.md` or `AGENTS.md` describing the tree instead of linking to
  it. `CLAUDE.md` links to the specs board and the ADR log and says what each is for;
  `AGENTS.md` points at `CLAUDE.md`.
