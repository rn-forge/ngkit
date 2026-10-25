// A tiny static server. ROOT (relative to the workspace root) defaults to the built
// Storybook; with SPA=1 unknown paths fall back to index.html.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(
  import.meta.dirname,
  '../..',
  process.env.ROOT ?? 'dist/storybook/ng-tailwind',
);
const port = Number(process.env.PORT ?? 4402);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'file:///').pathname);
  const file = join(root, normalize(path === '/' ? '/index.html' : path));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file).catch((err) => {
      if (process.env.SPA && !extname(file))
        return readFile(join(root, 'index.html'));
      throw err;
    });
    res.writeHead(200, {
      'content-type': types[extname(file)] ?? 'application/octet-stream',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(port, () => console.log(`Serving ${root} on ${port}`));
