# @rn-forge/ng-tailwind

Angular components styled with prebuilt CSS on `--rnf-*` design tokens. Light and dark come from `color-scheme` and `light-dark()`. Tailwind v4 is optional: a small bridge file maps the tokens to Tailwind theme variables, and a plain Angular app works without it. The package sets no preflight, reset, font, `color-scheme` or brand palette.

## Install

```bash
pnpm add @rn-forge/ng-tailwind
```

`@angular/core` is a peer. `tailwindcss` (`^4`) is an optional peer, needed only for the bridge.

## Plain Angular app

In the global stylesheet:

```css
@import '@rn-forge/ng-tailwind/tokens.css';
/* optional: focus ring, body colours, reduced motion */
@import '@rn-forge/ng-tailwind/base.css';
```

Tokens follow the `color-scheme` of the element that uses them, so set it yourself. Pick one:

```css
/* 1. Dark */
html {
  color-scheme: dark;
}

/* 2. Follow the OS */
html {
  color-scheme: light dark;
}

/* 3. Neither: light */
```

Override any `--rnf-*` token in an unlayered rule, which wins over the package's layers:

```css
:root {
  --rnf-accent: #0b5fff;
}
```

## Tailwind v4 app

In the global stylesheet, in this order (CSS allows `@import` only before other rules, so your token values go in their own file):

```css
@import '@rn-forge/ng-tailwind/tokens.css';

/* your own --rnf-* values and color-scheme, e.g. :root { color-scheme: light dark; } */
@import './theme.css';

@import 'tailwindcss';
@source '../src';

@import '@rn-forge/ng-tailwind/tailwind.css';
```

Importing the package sheets before Tailwind declares the `rnf` layer first, so utilities win over component rules. The bridge clears Tailwind's default palette (`--color-*: initial`), so default-palette utilities such as `bg-blue-500` produce nothing; colour utilities come from the `--rnf-*` tokens.

## Tones

A component's tone is the custom property `--rnf-tone`. For a hue the package does not define, set it on the host yourself:

```css
.my-badge {
  --rnf-tone: #7a3cff;
}
```

## Visually hidden text

Use the CDK's `cdk-visually-hidden` class. The package adds no `sr-only` class.

## Components

### `rnfButton`

Put the attribute on a native `<button>` or `<a>`; the element keeps its tag, its `type` and any `routerLink`.

```ts
import { RnfButton } from '@rn-forge/ng-tailwind';
```

```html
<button rnfButton variant="primary" (click)="save()">Save</button>
<a rnfButton routerLink="/orders" shape="pill" size="sm">Orders</a>
```

| Input      | Values                                                   | Default     |
| ---------- | -------------------------------------------------------- | ----------- |
| `variant`  | `secondary`, `primary`, `accent`, `ghost`, `danger`      | `secondary` |
| `shape`    | `default`, `pill`                                        | `default`   |
| `size`     | `md`, `sm`                                               | `md`        |
| `disabled` | boolean attribute                                        | `false`     |
| `busy`     | boolean attribute; sets `aria-busy` and disables as above | `false`     |

A disabled or busy `<button>` gets the native `disabled` attribute. A disabled or busy `<a>` gets `aria-disabled="true"` and `tabindex="-1"`, and its clicks are swallowed: neither `routerLink` nor a `(click)` handler on it runs.

## CSS variable namespacing

Components read the global `--rnf-*` tokens from their own styles, so do not enable Angular's `provideCssVarNamespacing()` in an application that uses this package: it renames the custom properties inside component styles, and the components would no longer see the tokens from `tokens.css`.
