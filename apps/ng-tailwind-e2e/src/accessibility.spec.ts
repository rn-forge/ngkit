import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const tokensStory = 'foundations-tokens--tokens';
const buttonStories = [
  'components-button--default',
  'components-button--buttons',
  'components-button--buttons-disabled',
  'components-button--buttons-busy',
  'components-button--links',
  'components-button--links-disabled',
  'components-button--links-busy',
];

async function open(page: Page, id: string): Promise<void> {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
  await page.locator('#storybook-root *').first().waitFor();
}

/** Parses a computed `rgb()`, `rgba()` or `color(srgb ...)` value into 0-1 channels and alpha. */
function parseColour(value: string): { rgb: number[]; alpha: number } {
  const srgb = /^color\(srgb\s+([^)]+)\)$/.exec(value);
  if (srgb) {
    const [channels, alpha] = srgb[1].split('/');
    return {
      rgb: channels.trim().split(/\s+/).map(Number),
      alpha: alpha === undefined ? 1 : Number(alpha),
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(value);
  if (rgb) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    return {
      rgb: parts.slice(0, 3).map((c) => c / 255),
      alpha: parts[3] ?? 1,
    };
  }
  throw new Error(`Unsupported computed colour: ${value}`);
}

/** WCAG 2.1 contrast ratio of two opaque colours. */
function contrast(a: string, b: string): number {
  const luminance = (value: string): number => {
    const [r, g, bl] = parseColour(value).rgb.map((c) =>
      c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`colorScheme ${colorScheme}`, () => {
    test.use({ colorScheme });

    for (const id of [tokensStory, ...buttonStories]) {
      test(`axe reports no color-contrast violation: ${id}`, async ({
        page,
      }) => {
        await open(page, id);
        const { violations } = await new AxeBuilder({ page })
          .include('#storybook-root')
          .withRules(['color-contrast'])
          .analyze();
        expect(violations).toEqual([]);
      });
    }

    test('border-strong and focus reach 3:1 on every surface', async ({
      page,
    }) => {
      await open(page, tokensStory);
      const swatches = page.locator('[data-kind="line"]');
      await expect(swatches).toHaveCount(6);
      const pairs = await swatches.evaluateAll((els) =>
        els.map((el) => ({
          fg: el.getAttribute('data-fg'),
          bg: el.getAttribute('data-bg'),
          fgColour: getComputedStyle(el).backgroundColor,
          bgColour: getComputedStyle(el.parentElement as Element)
            .backgroundColor,
        })),
      );
      for (const pair of pairs) {
        const ratio = contrast(pair.fgColour, pair.bgColour);
        console.log(
          `${colorScheme} ${pair.fg} ${pair.fgColour} on ${pair.bg} ${pair.bgColour}: ${ratio.toFixed(2)}`,
        );
        expect(ratio, `${pair.fg} on ${pair.bg}`).toBeGreaterThanOrEqual(3);
      }
    });
  });
}

test.describe('scoped color-scheme', () => {
  test.use({ colorScheme: 'light' });

  test('a dark container switches its tokens and its button, nothing outside', async ({
    page,
  }) => {
    await open(page, 'components-button--default');
    const result = await page.evaluate(() => {
      const button = document.querySelector('button[rnfButton]') as HTMLElement;
      const probe = (parent: Element): { surface: string; button: string } => {
        const child = document.createElement('div');
        child.style.backgroundColor = 'var(--rnf-surface-0)';
        parent.append(child);
        const surface = getComputedStyle(child).backgroundColor;
        child.remove();
        const inner = parent.querySelector('button') as HTMLElement;
        return { surface, button: getComputedStyle(inner).backgroundColor };
      };
      const make = (scheme: string): HTMLElement => {
        const box = document.createElement('div');
        box.style.colorScheme = scheme;
        box.append(button.cloneNode(true));
        document.body.append(box);
        return box;
      };
      return {
        light: probe(make('light')),
        dark: probe(make('dark')),
        outside: probe(button.parentElement as Element),
      };
    });
    expect(result.dark.surface).not.toBe(result.light.surface);
    expect(result.dark.button).not.toBe(result.light.button);
    expect(result.outside.surface).toBe(result.light.surface);
  });
});

test.describe('forced colors', () => {
  // `test.use({ forcedColors })` did not take effect in Playwright 1.61.1 here
  // (matchMedia stayed false), so the emulation is set on the page.
  test.beforeEach(({ page }) => page.emulateMedia({ forcedColors: 'active' }));

  test('every variant has a border and a focused button an outline', async ({
    page,
  }) => {
    await open(page, 'components-button--buttons');
    const buttons = page.locator('button[rnfButton]');
    const variants = await buttons.evaluateAll((els) =>
      els.map((el) => ({
        variant: el.getAttribute('data-variant'),
        border: getComputedStyle(el).borderTopColor,
      })),
    );
    expect(new Set(variants.map((v) => v.variant)).size).toBe(5);
    for (const { variant, border } of variants) {
      expect(border, variant ?? '').not.toBe('rgba(0, 0, 0, 0)');
      expect(border, variant ?? '').not.toBe('transparent');
    }
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as Element);
      return {
        style: style.outlineStyle,
        width: parseFloat(style.outlineWidth),
      };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);
  });
});

test.describe('reduced motion', () => {
  // As for forced colors: `test.use({ reducedMotion })` did not take effect.
  test.beforeEach(({ page }) => page.emulateMedia({ reducedMotion: 'reduce' }));

  test('a button transition lasts at most 0.01s', async ({ page }) => {
    await open(page, 'components-button--default');
    const durations = await page
      .locator('button[rnfButton]')
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    for (const part of durations.split(',')) {
      expect(parseFloat(part)).toBeLessThanOrEqual(0.01);
    }
  });
});

test.describe('keyboard', () => {
  test('Tab reaches a button; Enter and Space activate it', async ({
    page,
  }) => {
    await open(page, 'components-button--default');
    await page.evaluate(() => {
      const w = window as unknown as { clicks: number };
      w.clicks = 0;
      document
        .querySelector('button[rnfButton]')
        ?.addEventListener('click', () => w.clicks++);
    });
    await page.keyboard.press('Tab');
    await expect(page.locator('button[rnfButton]')).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    expect(
      await page.evaluate(
        () => (window as unknown as { clicks: number }).clicks,
      ),
    ).toBe(2);
  });

  test('Tab reaches an enabled link; Enter follows it', async ({ page }) => {
    await open(page, 'components-button--links');
    await page.evaluate(() => {
      const w = window as unknown as { follows: number; prevented: boolean };
      w.follows = 0;
      document.addEventListener('click', (event) => {
        if ((event.target as Element).closest('a[rnfButton]')) {
          w.follows++;
          w.prevented = event.defaultPrevented === false;
          event.preventDefault();
        }
      });
    });
    await page.keyboard.press('Tab');
    await expect(page.locator('a[rnfButton]').first()).toBeFocused();
    await page.keyboard.press('Enter');
    expect(
      await page.evaluate(
        () => (window as unknown as { follows: number }).follows,
      ),
    ).toBe(1);
  });

  test('Tab skips a disabled link', async ({ page }) => {
    await open(page, 'components-button--links-disabled');
    expect(await page.locator('a[rnfButton]').count()).toBeGreaterThan(0);
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(
        () => document.activeElement?.closest('a[rnfButton]') ?? null,
      ),
    ).toBeNull();
  });
});
