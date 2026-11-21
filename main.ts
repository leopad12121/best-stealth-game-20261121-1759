// Entry program for The Lantern Archive (Node 22, standard library only).
// It hands the game in: copies this repository's game/ and screenshots/ into the
// output directory and writes /output/dossier.json, the summary the judge reads,
// using the vendored make.fun library. The copy is a plain byte-for-byte copy
// with no timestamps or random data written anywhere, so running it twice in a
// row produces byte-identical output trees. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output, so a local check looks like:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's own caps, so a local run refuses an entry the scorer would refuse:
// at most 4 screenshots, each at most 256 KiB; game/ at most 993 files and
// 48 MiB in all, no path under game/ longer than 1000 bytes.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
