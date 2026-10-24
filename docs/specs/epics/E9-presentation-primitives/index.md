# E9 — Presentation primitives

**Status:** deferred · **Owner:** ngkit

**Entry criteria:** [E8](../E8-tailwind-package/index.md) is done and the owner schedules it.

**Source:** former roadmap item T2.

Small presentation components for `ng-tailwind`, one component family per review.

[Back to the board](../../index.md)

## Design

1. StatusBadge: `tone: success|warning|danger|neutral`, required visible label, optional description and `appearance: default|bare`. The app maps its own status type to a tone; the badge imports no domain type.
2. EmptyState: projected icon/content/actions with neutral layout. The app supplies the prose and icon.
3. StateBlock: heading/description/action projection, a `tone` input (`neutral|success|warning|danger`, default `neutral`) and a `live` input (see [Reconciliation](#reconciliation-statusbadge-and-stateblock)); no hard Router dependency. Consumers use a native link or button.
4. PageSkeleton: configurable line count and loading/stalled messages. Lines aria-hidden; no animation by default. Timings come from [E6](../E6-asynchronous-resource/index.md). No fixed copy; accessible status announcement.
5. ThemeToggle: controlled mode input and change output, configurable accessible labels; it need not inject a global controller.

Test light/dark, reduced motion, forced colors, visible text and native action semantics. Production consumer CSS must work without source scanning.

## Further families

A consumer application builds these in its own `ui/` folder to [E8's conventions](../E8-tailwind-package/index.md#prior-art-an-applications-ui-folder), so moving them here is a rename. Nothing here is built until E8 is done and the owner schedules this epic. Each family is a thin styled layer over Angular's own behaviour ([ADR-0001](../../../adr/ADR-0001.md) principle 1); the component adds tokens, styles and inputs, and does not reimplement roles, focus or keyboard handling.

6. **Modal**: on `@angular/cdk/dialog` (focus trap, Escape, backdrop, `role="dialog"` with `aria-modal` and a labelled title), with an actions slot (`[rnfModalActions]`).
7. **ConfirmDialog**: a Modal with a message and confirm and cancel actions; the confirm action's label and tone are inputs.
8. **Button**: moved to [E8's F8.3](../E8-tailwind-package/F8.3-button.md) (2026-10-24) as the package's first component.
9. **Toolbar**: on `@angular/aria`'s toolbar (one tab stop, arrow keys between controls).
10. **SelectionChip** and **ChipsInput**: chips as an `@angular/aria` listbox with removable options; ChipsInput commits free text as chips.
11. **AutocompleteInput**: on `@angular/aria`'s combobox with a listbox popup.
12. **FieldControl**: a label, control and message wrapper that wires `for`, `aria-describedby` and error state.

Not added: a Panel (a bordered surface is CSS the application owns) and table-specific spacing on Toolbar (layout belongs to the screen).

### Reconciliation: StatusBadge and StateBlock

A block-level message with a tone is E9's **StateBlock**, not a separate Notice: StateBlock gains `tone: neutral | success | warning | danger` (default `neutral`), the same vocabulary as StatusBadge's `tone`. Inline pills and status labels are **StatusBadge**. EmptyState, PageSkeleton and ThemeToggle are built from items 1 to 5 as written.

The tone vocabulary and mechanism are E8's ([F8.2](../E8-tailwind-package/F8.2-css-contract.md#tones)), which adds `accent` and `info` to the four named here; StatusBadge and StateBlock take that vocabulary when this epic is elaborated.

Live-region semantics are an input, not implied by tone: `live: 'off' | 'polite' | 'assertive'` (default `'off'`) sets `role="status"` for `polite` and `role="alert"` for `assertive`. A block shown in response to an action, such as a failed save, sets it; a persistent block, such as an empty or error page, does not, so screen readers are not interrupted by static content.

## Survey, 2026-10-24

Consumer evidence from [E8's survey](../E8-tailwind-package/index.md#survey-2026-10-24) of three applications to be rebuilt on this package. It does not elaborate this epic; it records what the families above must support, and the patterns none of them covers, for when the owner schedules it.

**Needs of the planned families.**

- **Modal:** a `size` of `dialog | panel | drawer` (a right-docked drawer is the most used, four times in one application), and a dismissal guard: a `dirty` input with a `dismissAttempt` output, so unsaved work survives Escape and backdrop clicks. A backdrop click counts only when press and release both land on the backdrop. One application's hand-rolled modal had no `role="dialog"`, focus trap or Escape.
- **ConfirmDialog:** a typed confirmation, where confirming an action on more than a threshold of items requires typing the count; the danger tone.
- **ChipsInput and AutocompleteInput:** suggestions arrive as an input signal and the query leaves as an output, so the application owns the fetch (one application copied a debounced, cached fetch into both); an existing-versus-new value marker.
- **StateBlock, EmptyState and PageSkeleton:** one application repeats a loading, error and empty triad in six screens and inline action notices in ten; none of the three has a skeleton today.
- **FieldControl:** wiring `aria-describedby` to help and error text, which no surveyed form with help text wired.

**Patterns no family covers yet**, each found in at least two applications or at three or more sites in one:

| Pattern                | Evidence                                                                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell and nav rail | A sidebar with sections, icons, `aria-current`, badges and a footer in two, a top bar with brand and status pills in the third; one sidebar collapses to an icon rail and then to bottom tabs, with a skip link. |
| PageHeader, Breadcrumb | Title, eyebrow or meta, actions and status in all three; a breadcrumb `<ol>` with `aria-current` in one.                                                                                                         |
| Command palette        | The renderer over [F12.8](../E12-on-demand-features/index.md#f128--commandregistry)'s registry, with a free-text fallback action; the surveyed palette had no focus trap or active descendant.                   |
| Table styling          | A sticky uppercase header, separators, hover and selected rows, right-aligned numbers and an empty row in all three; one splits header and body into two tables to keep the header over CDK virtual scroll.      |
| Sortable header        | A header button rendering `aria-sort` and an arrow from [F12.4](../E12-on-demand-features/index.md#f124--client-side-collection-query)'s `SortState`, in four tables of one application.                         |
| Segmented control      | Single-choice chip groups and a view toggle in two applications, one without arrow keys, one without `aria-pressed`, one icon-only without labels.                                                               |
| StatCard               | A label, a large monospaced value with a unit, and a sub-line, in two applications (13 instances).                                                                                                               |
| ProgressBar            | `role="progressbar"` or `<progress>` with a percentage, in two (five sites).                                                                                                                                     |
| Pager                  | Previous and Next with "page x of y", three screens of one application.                                                                                                                                          |

[E10](../E10-connected-menu/index.md)'s connected menu had no consumer in the survey: none of the three uses action menus. Two need a popover or disclosure (a column manager and a queue list), which CDK overlay covers.
