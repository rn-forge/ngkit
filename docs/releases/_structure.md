# releases/ — what belongs here

## Belongs here

- One page per release, `release-<n>/index.md`: its `**Status:**` (`planned`,
  `in progress`, or `shipped` with the date and version), entry criteria, scope,
  breaking changes to announce, and exit criteria.
- Scope named by story ID, linking to the feature file that holds the story. An epic
  that predates the story taxonomy is named by feature ID instead, and the page says
  so.

## Does not belong here

| Instead of                           | Put it in                  |
| ------------------------------------ | -------------------------- |
| A story's text, acceptance or design | its feature under `specs/` |
| A story's status                     | the story itself           |
| Why a choice was made                | an ADR under `adr/`        |

## Changing this area

1. Cut a release page when there is scope to put on it, not ahead of time.
2. Give it its status, entry criteria, scope as story IDs, breaking changes and exit
   criteria. Nothing else: the detail lives with the story.
3. List it in `index.md`, newest first.

A story belongs to exactly one release at a time, and that assignment lives only on
the release page. When a release ships, set `shipped` with the date and version once
its exit criteria hold.
