#!/usr/bin/env node
/**
 * Copies option-profile JSON artifacts into the frontend's static dirs:
 *  - profiles/profiles-index.json      -> public/profiles/ + dist/profiles/
 *  - src-tauri/profiles/*.json         -> public/profiles/ + dist/profiles/
 *
 * Run before `vite build` (keeps public/profiles in sync) and after
 * `vite build` (vite empties dist/, so dist/profiles must be re-created).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const sources = [join(root, 'profiles'), join(root, 'src-tauri', 'profiles')];
const targets = [join(root, 'public', 'profiles'), join(root, 'dist', 'profiles')];

let copied = 0;
for (const src of sources) {
  if (!existsSync(src)) continue;
  for (const entry of readdirSync(src)) {
    if (!entry.endsWith('.json')) continue;
    const from = join(src, entry);
    if (!statSync(from).isFile()) continue;
    for (const target of targets) {
      mkdirSync(target, { recursive: true });
      cpSync(from, join(target, entry));
      copied++;
    }
  }
}

console.log(`copy-profiles: ${copied} file(s) copied into public/profiles and dist/profiles`);
