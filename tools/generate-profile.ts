#!/usr/bin/env node
/**
 * generate-profile.ts — parse upstream video-compare main.cpp argagg table
 * and produce a draft option profile JSON.
 *
 * Usage: npx tsx tools/generate-profile.ts <path-to-main.cpp> [output.json]
 */
import { readFileSync, writeFileSync } from 'fs';

const mainCppPath = process.argv[2];
const outputPath = process.argv[3] ?? 'profiles/video-compare-draft.json';

if (!mainCppPath) {
  console.error('Usage: npx tsx tools/generate-profile.ts <main.cpp> [output.json]');
  process.exit(1);
}

const source = readFileSync(mainCppPath, 'utf-8');

// Extract option definitions from argagg table
const optionRegex = /\{"([^"]+)",\s*\{([^}]+)\},\s*"([^"]+)",\s*(\d+)\}/g;
const options: unknown[] = [];
let match;

while ((match = optionRegex.exec(source)) !== null) {
  const [, id, flags, help, hasArg] = match;
  const flagList = flags.split(',').map((f) => f.trim().replace(/"/g, ''));
  const longFlag = flagList.find((f) => f.startsWith('--')) ?? flagList[0];
  const shortFlag = flagList.find((f) => f.startsWith('-') && !f.startsWith('--'));

  options.push({
    id,
    flag: longFlag,
    short: shortFlag,
    label: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    help,
    group: 'advanced',
    appliesTo: 'global',
    type: hasArg === '1' ? { kind: 'string' } : { kind: 'bool' },
  });
}

const profile = {
  profileVersion: 1,
  minAppVersion: '0.1.0',
  upstream: { version: 'unknown' },
  groups: [
    { id: 'quick', label: 'Quick', order: 0 },
    { id: 'display', label: 'Display', order: 1 },
    { id: 'playback', label: 'Playback', order: 2 },
    { id: 'color', label: 'Color', order: 3 },
    { id: 'filters', label: 'Filters', order: 4 },
    { id: 'io', label: 'Inputs & Decoding', order: 5 },
    { id: 'scopes', label: 'Scopes', order: 6 },
    { id: 'advanced', label: 'Advanced', order: 7 },
  ],
  options,
};

writeFileSync(outputPath, JSON.stringify(profile, null, 2));
console.log(`Wrote ${options.length} options to ${outputPath}`);
