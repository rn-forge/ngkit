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
8. **Button**: selector `button[rnfButton], a[rnfButton]`; `variant` is `primary | ghost | accent | danger` and `shape` is `default | pill`. Native element semantics are kept, so a link stays a link.
9. **Toolbar**: on `@angular/aria`'s toolbar (one tab stop, arrow keys between controls).
10. **SelectionChip** and **ChipsInput**: chips as an `@angular/aria` listbox with removable options; ChipsInput commits free text as chips.
11. **AutocompleteInput**: on `@angular/aria`'s combobox with a listbox popup.
12. **FieldControl**: a label, control and message wrapper that wires `for`, `aria-describedby` and error state.

Not added: a Panel (a bordered surface is CSS the application owns) and table-specific spacing on Toolbar (layout belongs to the screen).

### Reconciliation: StatusBadge and StateBlock

A block-level message with a tone is E9's **StateBlock**, not a separate Notice: StateBlock gains `tone: neutral | success | warning | danger` (default `neutral`), the same vocabulary as StatusBadge's `tone`. Inline pills and status labels are **StatusBadge**. EmptyState, PageSkeleton and ThemeToggle are built from items 1 to 5 as written.

Live-region semantics are an input, not implied by tone: `live: 'off' | 'polite' | 'assertive'` (default `'off'`) sets `role="status"` for `polite` and `role="alert"` for `assertive`. A block shown in response to an action, such as a failed save, sets it; a persistent block, such as an empty or error page, does not, so screen readers are not interrupted by static content.
