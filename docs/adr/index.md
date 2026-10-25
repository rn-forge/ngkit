# Decisions

Choices between real alternatives, newest last. Each states the decision, its consequences and the options that were rejected.

| Decision                                                                                                                         | Scope                                      | Status   |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------- |
| [ADR-0001: Standards and proven libraries come first; ngkit wraps, never reimplements](ADR-0001.md)                              | every entry point and package              | accepted |
| [ADR-0002: Package boundaries are one-way; presentation libraries only render](ADR-0002.md)                                      | every package and entry point              | accepted |
| [ADR-0003: `ng` and `ng-bootstrap` release together under fixed versioning and ship as tarballs on GitHub Releases](ADR-0003.md) | every publishable library                  | accepted |
| [ADR-0004: ngkit ships no HTTP client; applications use Angular's `HttpClient`](ADR-0004.md)                                     | every entry point                          | accepted |
| [ADR-0005: The resource screen targets published wire standards, not a backend](ADR-0005.md)                                     | the resource screen                        | accepted |
| [ADR-0006: The browser holds a backend session, never a token; the backend runs every login protocol](ADR-0006.md)               | `ng/auth` and `ng-bootstrap/auth`          | proposed |
| [ADR-0007: ngkit's docs follow the shared rn-forge docs standard](ADR-0007.md)                                                   | `docs/`, READMEs, `CLAUDE.md`, `AGENTS.md` | accepted |
| [ADR-0008: `ng-tailwind` ships prebuilt, scoped CSS on namespaced tokens; Tailwind is an optional bridge](ADR-0008.md)           | `@rn-forge/ng-tailwind`                    | accepted |
