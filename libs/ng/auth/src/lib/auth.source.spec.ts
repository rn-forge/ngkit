/// <reference types="node" />
// external imports
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('session source', () => {
  it('contains no token storage, decoding or bearer header code', () => {
    const root = join(process.cwd(), 'libs/ng/auth/src');
    const forbidden = [
      'local' + 'Storage',
      'jwt' + '-decode',
      'Author' + 'ization',
    ];
    for (const path of readdirSync(root, { recursive: true }) as string[]) {
      if (!path.endsWith('.ts')) continue;
      const source = readFileSync(join(root, path), 'utf8');
      for (const word of forbidden) expect(source, path).not.toContain(word);
    }
  });
});
