// Bundles the API (including the shared app domain code) into dist/server.js.
import { cpSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [resolve(here, 'src/main.ts')],
  outfile: resolve(here, 'dist/server.js'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  // pg loads pg-native only when asked to; it is not installed.
  external: ['pg-native'],
  alias: { '@/components/icon': resolve(here, 'src/shims/icon.ts'), '@': resolve(here, '../app/src') },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'info',
});

cpSync(resolve(here, 'migrations'), resolve(here, 'dist/migrations'), { recursive: true });
