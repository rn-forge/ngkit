/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import postcss, { AtRule, Declaration, Root, Rule } from 'postcss';

/** Finds `assets/<file>` whether the runner's cwd is the workspace root or the project root. */
function readAsset(file: string): string {
  const candidates = [
    resolve(process.cwd(), 'libs/ng-tailwind/assets', file),
    resolve(process.cwd(), 'assets', file),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(`Cannot find ${file}; looked in ${candidates.join(', ')}`);
  }
  return readFileSync(join(found), 'utf8');
}

function parseAsset(file: string): Root {
  return postcss.parse(readAsset(file), { from: file });
}

describe('css contract: tokens.css (F8.2, S8.2.2)', () => {
  const colourTokens = [
    'surface-0',
    'surface-1',
    'surface-2',
    'surface-3',
    'text',
    'text-muted',
    'text-subtle',
    'border',
    'border-strong',
    'focus',
    'accent',
    'accent-muted',
    'on-accent',
    'neutral',
    'info',
    'success',
    'warning',
    'danger',
  ];
  const otherTokens = [
    'radius-control',
    'radius',
    'radius-lg',
    'radius-pill',
    'font-ui',
    'font-data',
    'text-xs',
    'text-sm',
    'text-md',
    'control-sm',
    'control-md',
    'duration-fast',
    'duration',
    'ease',
    'shadow-raised',
    'shadow-overlay',
  ];
  const expected = [...colourTokens, ...otherTokens].map(
    (name) => `--rnf-${name}`,
  );

  const root = parseAsset('tokens.css');
  const rules: Rule[] = [];
  root.walkRules((rule) => {
    rules.push(rule);
  });
  const decls: Declaration[] = [];
  root.walkDecls((decl) => {
    decls.push(decl);
  });

  it('has only @layer rnf at the top level', () => {
    const nodes = root.nodes.filter((node) => node.type !== 'comment');
    expect(nodes).toHaveLength(1);
    const layer = nodes[0] as AtRule;
    expect(layer.type).toBe('atrule');
    expect(layer.name).toBe('layer');
    expect(layer.params).toBe('rnf');
  });

  it('declares every rule inside @layer rnf on :root', () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.selector).toBe(':root');
      expect(rule.parent?.type).toBe('atrule');
      expect((rule.parent as AtRule).name).toBe('layer');
      expect((rule.parent as AtRule).params).toBe('rnf');
    }
  });

  it('declares only --rnf-* custom properties', () => {
    for (const decl of decls) {
      expect(decl.prop).toMatch(/^--rnf-/);
    }
  });

  it('declares exactly the F8.2 token set, once each', () => {
    const names = decls.map((decl) => decl.prop);
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort()).toEqual([...expected].sort());
  });

  it('declares every colour token as a light-dark() pair', () => {
    for (const name of colourTokens) {
      const decl = decls.find((d) => d.prop === `--rnf-${name}`);
      const value = decl?.value ?? '';
      const match = /^light-dark\(\s*([^,()]+?)\s*,\s*([^,()]+?)\s*\)$/.exec(
        value,
      );
      expect(match, `${name}: ${value}`).not.toBeNull();
    }
  });

  it('declares every non-colour token as a single value', () => {
    for (const name of otherTokens) {
      const decl = decls.find((d) => d.prop === `--rnf-${name}`);
      expect(decl?.value, name).not.toContain('light-dark(');
    }
  });

  it('declares no color-scheme or font-family', () => {
    for (const decl of decls) {
      expect(decl.prop).not.toBe('color-scheme');
      expect(decl.prop).not.toBe('font-family');
    }
  });
});

describe('css contract: base.css (F8.2, S8.2.3)', () => {
  const root = parseAsset('base.css');
  const layer = root.nodes.find(
    (node): node is AtRule => node.type === 'atrule' && node.name === 'layer',
  );
  const reducedMotion = '(prefers-reduced-motion: reduce)';
  const colourNames = [
    'black',
    'white',
    'red',
    'green',
    'blue',
    'yellow',
    'orange',
    'purple',
    'pink',
    'brown',
    'gray',
    'grey',
    'cyan',
    'magenta',
    'silver',
    'gold',
    'navy',
    'teal',
    'lime',
    'maroon',
    'olive',
    'aqua',
    'fuchsia',
    'indigo',
    'violet',
    'crimson',
    'coral',
    'salmon',
    'tomato',
    'beige',
    'ivory',
  ];
  const rules: Rule[] = [];
  root.walkRules((rule) => {
    rules.push(rule);
  });
  const decls: Declaration[] = [];
  root.walkDecls((decl) => {
    decls.push(decl);
  });

  it('has only @layer rnf at the top level', () => {
    const nodes = root.nodes.filter((node) => node.type !== 'comment');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toBe(layer);
    expect(layer?.params).toBe('rnf');
  });

  it('puts every rule inside the layer, or its reduced-motion block', () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      const parent = rule.parent as AtRule;
      expect(parent.type).toBe('atrule');
      if (parent.name === 'layer') {
        expect(parent).toBe(layer);
      } else {
        expect(parent.name).toBe('media');
        expect(parent.params).toBe(reducedMotion);
        expect(parent.parent).toBe(layer);
      }
    }
  });

  it('styles exactly body, :focus-visible, :root and table in the layer', () => {
    const selectors = (layer?.nodes ?? [])
      .filter((node): node is Rule => node.type === 'rule')
      .map((rule) => rule.selector);
    expect([...selectors].sort()).toEqual(
      ['body', ':focus-visible', ':root', 'table'].sort(),
    );
  });

  it('has only the prefers-reduced-motion: reduce media query', () => {
    const medias: AtRule[] = [];
    root.walkAtRules('media', (atRule) => {
      medias.push(atRule);
    });
    expect(medias).toHaveLength(1);
    expect(medias[0].params).toBe(reducedMotion);
  });

  it('declares no box-sizing, margin or color-scheme', () => {
    for (const decl of decls) {
      expect(decl.prop).not.toBe('box-sizing');
      expect(decl.prop).not.toMatch(/^margin/);
      expect(decl.prop).not.toBe('color-scheme');
    }
  });

  it('declares font-family only as var(--rnf-font-ui)', () => {
    for (const decl of decls.filter((d) => d.prop === 'font-family')) {
      expect(decl.value).toBe('var(--rnf-font-ui)');
    }
  });

  it('contains no colour literal', () => {
    for (const decl of decls) {
      const value = decl.value;
      expect(value, decl.prop).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(value, decl.prop).not.toMatch(
        /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i,
      );
      for (const word of value.split(/[\s,]+/)) {
        expect(colourNames, `${decl.prop}: ${word}`).not.toContain(
          word.toLowerCase(),
        );
      }
    }
  });

  it('references only --rnf-* custom properties', () => {
    for (const decl of decls) {
      for (const match of decl.value.matchAll(/var\(\s*(--[\w-]+)/g)) {
        expect(match[1]).toMatch(/^--rnf-/);
      }
    }
  });
});
