# E10 — Connected menu

**Status:** deferred · **Owner:** ngkit

**Entry criteria:** [E8](../E8-tailwind-package/index.md) is done and the owner schedules it.

**Source:** former roadmap item T3.

A connected menu for `ng-tailwind`.

[Back to the board](../../index.md)

## Design

Build on CDK Menu and overlay positioning: a generic trigger plus projected menu items, and an optional scoped exclusivity controller if CDK does not cover one-open-at-a-time behavior. Menu item models stay in the app.

Acceptance browser cases: keyboard open, ArrowUp/Down, Home/End, typeahead, Escape returning focus, trigger toggled twice, switching triggers, outside click, route navigation and destroyed trigger. Clicking another focusable control must not steal focus back to the old trigger. Links preserve query parameters and fragments. Test overlay placement near the viewport edge and inherited theme tokens.
