// SPDX-License-Identifier: MIT
// LIVE HEIST — the entry program (make.fun gta6-01).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json with the kit's buildDossier, so
// the sealed scorer can check the entry byte for byte. Runs on Node
// 22 with the standard library only; no network, no install step.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = resolve(import.meta.dirname ?? '.');
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(fromDir, toDir) {
  rmSync(toDir, { recursive: true, force: true });
  mkdirSync(toDir, { recursive: true });
  cpSync(fromDir, toDir, { recursive: true, dereference: false });
}

function main() {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(join(gameDir, 'index.html'))) {
    throw new Error('game/index.html is missing — nothing to hand in');
  }
  mkdirSync(OUT_DIR, { recursive: true });
  copyTree(gameDir, join(OUT_DIR, 'game'));
  if (existsSync(shotsDir)) {
    copyTree(shotsDir, join(OUT_DIR, 'screenshots'));
  }
  const dossier = buildDossier(OUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);
  const shotCount = existsSync(shotsDir) ? countShots(shotsDir) : 0;
  console.log(`LIVE HEIST handed in: game/ + ${shotCount} screenshot(s), dossier ${dossier.length} bytes -> ${OUT_DIR}`);
}

function countShots(dir) {
  return readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile()).length;
}

main();
