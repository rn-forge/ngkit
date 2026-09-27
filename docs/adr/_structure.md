# adr/ — what belongs here

## Belongs here

A durable choice that constrains future implementations. Each ADR answers one
question: what was chosen, why, and what tradeoff follows.

A feature of the libraries is not a decision. If the page describes what ngkit does,
it belongs in `architecture/` or `specs/`; if it describes a constraint every future
implementation must respect, it belongs here.

## Does not belong here

| Instead of                                      | Put it in                                     |
| ----------------------------------------------- | --------------------------------------------- |
| Scope, supported combinations, rollout work     | `specs/`                                      |
| Implementation details and local design choices | the owning feature's Design                   |
| Exact signatures and options                    | the entry point's `README.md` or doc comments |
| How implemented components fit together         | `architecture/`                               |
| Review transcripts and obsolete drafts          | version history                               |

## Naming and shape

- `ADR-<nnnn>.md`, listed in `index.md`. The title states the decision, not the
  topic.
- The first line:
  `**Status:** <proposed|accepted|deprecated> (<date>) · **Scope:** <what the decision binds>`.
- Then these sections, in order:
  1. `## Decision`: the choice, with only the context needed to state it.
  2. `## Consequences`: what follows, including the costs accepted.
  3. `## Influences`: links to the specs and architecture this decision constrains.
  4. `## Alternatives considered`: credible options, each with the failure that
     ruled it out.
  5. `## Background`: optional; the history that still explains the choice.
- Keep the first three sections to 300 words or fewer; they are read on every open.
  The last two are as long as the evidence needs, with 600 words a soft total.
- Name concrete costs, not summaries of them.

## Changing this area

New decisions take the next number. Rewrite a revised decision to state the current
choice, and add what changed under `Background` as a dated sentence. Don't append
earlier versions. An answered open question becomes a decision here only when it has
a durable consequence; otherwise record it on the feature.
