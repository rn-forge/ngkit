import { type Meta, type StoryObj } from '@storybook/angular';

const surfaces = [0, 1, 2] as const;
const texts = ['text', 'text-muted', 'text-subtle'] as const;
const tones = [
  'neutral',
  'accent',
  'info',
  'success',
  'warning',
  'danger',
] as const;
const lines = ['border-strong', 'focus'] as const;

const surfaceStyle = (n: number): string =>
  `background-color:var(--rnf-surface-${n});padding:0.75rem;display:flex;gap:1.5rem;align-items:center`;

/** Each text token as text on each surface; `data-fg` and `data-bg` name the pair. */
const textRows = surfaces
  .map(
    (n) =>
      `<div data-bg="surface-${n}" style="${surfaceStyle(n)}">${texts
        .map(
          (t) =>
            `<span data-kind="text" data-fg="${t}" data-bg="surface-${n}" style="color:var(--rnf-${t})">${t} on surface-${n}</span>`,
        )
        .join('')}</div>`,
  )
  .join('');

/** Each tone's text on its own wash over surface-1 (F8.2 derives the wash with `color-mix()`). */
const toneRow = `<div data-bg="surface-1" style="${surfaceStyle(1)}">${tones
  .map(
    (t) =>
      `<span data-kind="tone" data-fg="${t}" data-bg="${t}-wash" style="--rnf-tone:var(--rnf-${t});color:var(--rnf-tone);background-color:color-mix(in srgb, var(--rnf-tone) 12%, transparent);padding:0.25rem 0.5rem">${t}</span>`,
  )
  .join('')}</div>`;

/** `border-strong` and `focus` as filled swatches on each surface. */
const lineRows = surfaces
  .map(
    (n) =>
      `<div data-bg="surface-${n}" style="${surfaceStyle(n)}">${lines
        .map(
          (l) =>
            `<span data-kind="line" data-fg="${l}" data-bg="surface-${n}" style="background-color:var(--rnf-${l});inline-size:3rem;block-size:1rem"></span>`,
        )
        .join('')}</div>`,
  )
  .join('');

const meta: Meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Tokens: StoryObj = {
  render: () => ({
    template: `<div style="color-scheme:light dark">${textRows}${toneRow}${lineRows}</div>`,
  }),
};
