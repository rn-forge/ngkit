# E9 — Presentation primitives

**Status:** deferred · **Owner:** ngkit

**Entry criteria:** [E8](../E8-tailwind-package/index.md) is done and the owner schedules it.

**Source:** former roadmap item T2.

Small presentation components for `ng-tailwind`, one component family per review.

[Back to the board](../../index.md)

## Design

1. StatusBadge: `tone: success|warning|danger|neutral`, required visible label, optional description and `appearance: default|bare`. The app maps its own status type to a tone; the badge imports no domain type.
2. EmptyState: projected icon/content/actions with neutral layout. The app supplies the prose and icon.
3. StateBlock: heading/description/action projection; no hard Router dependency. Consumers use a native link or button.
4. PageSkeleton: configurable line count and loading/stalled messages. Lines aria-hidden; no animation by default. Timings come from [E6](../E6-asynchronous-resource/index.md). No fixed copy; accessible status announcement.
5. ThemeToggle: controlled mode input and change output, configurable accessible labels; it need not inject a global controller.

Test light/dark, reduced motion, forced colors, visible text and native action semantics. Production consumer CSS must work without source scanning.
