# ngkit

An [Nx](https://nx.dev) monorepo for the rn-forge Angular toolkit: reusable libraries published as `@rn-forge/ng` and `@rn-forge/ng-bootstrap`, plus a demo app used for local development and e2e testing.

## Read in this order

1. **[Specs](specs/index.md)**: the board. What is done, what is next, and which
   release it belongs to. Start here in a new session.
2. **[Decisions](adr/index.md)**: the ADR log, each decision with the alternatives
   that were rejected.
3. **[Workspace](architecture/workspace.md)**: the projects, entry points and how
   they depend on each other.
4. **[Building an app](guides/building-an-app.md)** and
   **[Developing ngkit](guides/development.md)**.
5. **[Releasing](runbooks/releasing.md)**.

## What each area is for

| Area                                  | Holds                                                           |
| ------------------------------------- | --------------------------------------------------------------- |
| [Architecture](architecture/index.md) | how the libraries work today                                    |
| [Guides](guides/index.md)             | building an app on ngkit; developing ngkit                      |
| [Runbooks](runbooks/index.md)         | procedures with decision points                                 |
| [Reference](reference/index.md)       | the generated API reference and component catalog               |
| [Releases](releases/index.md)         | what ships when, by story ID                                    |
| [Specs](specs/index.md)               | work: epics, features, stories, their design and open questions |
| [Decisions](adr/index.md)             | choices between real alternatives                               |
