#!/usr/bin/env node
/**
 * VidCompare screenshot regression comparison.
 *
 * Compares tests/screenshots/current/*.png against tests/screenshots/baseline/*.png
 * using pixelmatch with configurable threshold.
 *
 * Usage:
 *   node tests/screenshots/compare.mjs           # Compare, exit 1 on mismatch
 *   node tests/screenshots/compare.mjs --update  # Refresh baselines from current
 *   node tests/screenshots/compare.mjs --help    # Show help
 *
 * Exit codes:
 *   0 = all match (or --update succeeded)
 *   1 = mismatch found
 *   2 = usage error / missing directories
 */

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');
const SCREENSHOTS_DIR = join(ROOT, 'tests', 'screenshots');
const CURRENT_DIR = join(SCREENSHOTS_DIR, 'current');
const BASELINE_DIR = join(SCREENSHOTS_DIR, 'baseline');
const DIFF_DIR = join(SCREENSHOTS_DIR, 'diff');

const DEFAULT_THRESHOLD = 0.01; // 1% pixel difference allowed
const EXPECTED_FILES = [
  'main-window-light.png',
  'main-window-dark.png',
  'file-panels.png',
  'options-groups.png',
  'log-panel.png',
  'presets-bar.png',
  'find-helper-dialog.png',
];

function printHelp() {
  console.log(`
VidCompare Screenshot Regression Comparison
============================================

Compares current screenshots against baselines using pixelmatch.

Usage:
  node tests/screenshots/compare.mjs [--update] [--threshold=N] [--help]

Options:
  --update       Copy current screenshots to baseline (refresh golden images)
  --threshold=N  Pixel difference threshold 0-1 (default: 0.01 = 1%)
  --help         Show this help

Exit codes:
  0  All screenshots match (or --update completed)
  1  One or more screenshots differ beyond threshold
  2  Usage error or missing directories/files

Directories:
  Current:  ${CURRENT_DIR}
  Baseline: ${BASELINE_DIR}
  Diff:     ${DIFF_DIR} (created on mismatch)

Expected files (7):
${EXPECTED_FILES.map(f => `  ${f}`).join('\n')}
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { update: false, threshold: DEFAULT_THRESHOLD };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--update') {
      result.update = true;
    } else if (arg.startsWith('--threshold=')) {
      const val = parseFloat(arg.split('=')[1]);
      if (isNaN(val) || val < 0 || val > 1) {
        console.error('Error: --threshold must be a number between 0 and 1');
        process.exit(2);
      }
      result.threshold = val;
    } else if (arg.startsWith('-')) {
      console.error(`Error: Unknown option: ${arg}`);
      printHelp();
      process.exit(2);
    }
  }
  return result;
}

function loadPNG(path) {
  return new Promise((resolve, reject) => {
    const png = PNG.sync.read(require('node:fs').readFileSync(path));
    resolve(png);
  });
}

function savePNG(png, path) {
  require('node:fs').writeFileSync(path, PNG.sync.write(png));
}

async function compareImages(currentPath, baselinePath, diffPath, threshold) {
  const current = await loadPNG(currentPath);
  const baseline = await loadPNG(baselinePath);

  if (current.width !== baseline.width || current.height !== baseline.height) {
    return {
      match: false,
      reason: `Dimension mismatch: current ${current.width}x${current.height} vs baseline ${baseline.width}x${baseline.height}`,
      diffPixels: -1,
      totalPixels: current.width * current.height,
    };
  }

  const diff = new PNG({ width: current.width, height: current.height });
  const diffPixels = pixelmatch(
    current.data,
    baseline.data,
    diff.data,
    current.width,
    current.height,
    { threshold, includeAA: true, alpha: 0.1 }
  );

  const totalPixels = current.width * current.height;
  const diffRatio = diffPixels / totalPixels;
  const match = diffRatio <= threshold;

  if (!match && diffPath) {
    savePNG(diff, diffPath);
  }

  return { match, diffPixels, totalPixels, diffRatio };
}

async function updateBaselines() {
  if (!existsSync(CURRENT_DIR)) {
    console.error(`Error: Current directory not found: ${CURRENT_DIR}`);
    console.error('Run "npm run screenshots" first to generate current screenshots.');
    process.exit(2);
  }

  if (!existsSync(BASELINE_DIR)) {
    mkdirSync(BASELINE_DIR, { recursive: true });
  }

  let copied = 0;
  for (const file of EXPECTED_FILES) {
    const src = join(CURRENT_DIR, file);
    const dest = join(BASELINE_DIR, file);
    if (existsSync(src)) {
      copyFileSync(src, dest);
      console.log(`  Updated baseline: ${file}`);
      copied++;
    } else {
      console.warn(`  Warning: ${file} not found in current, skipping`);
    }
  }

  if (copied === 0) {
    console.error('Error: No screenshots found to update');
    process.exit(2);
  }

  console.log(`\n✓ Updated ${copied}/${EXPECTED_FILES.length} baseline images`);
}

async function runComparison(threshold) {
  if (!existsSync(CURRENT_DIR)) {
    console.error(`Error: Current directory not found: ${CURRENT_DIR}`);
    console.error('Run "npm run screenshots" first to generate current screenshots.');
    process.exit(2);
  }

  if (!existsSync(BASELINE_DIR)) {
    console.error(`Error: Baseline directory not found: ${BASELINE_DIR}`);
    console.error('Run "npm run screenshots:compare --update" to create initial baselines.');
    process.exit(2);
  }

  if (!existsSync(DIFF_DIR)) {
    mkdirSync(DIFF_DIR, { recursive: true });
  }

  console.log(`Comparing screenshots (threshold: ${(threshold * 100).toFixed(2)}%)\n`);

  let allMatch = true;
  const results = [];

  for (const file of EXPECTED_FILES) {
    const currentPath = join(CURRENT_DIR, file);
    const baselinePath = join(BASELINE_DIR, file);
    const diffPath = join(DIFF_DIR, file);

    if (!existsSync(currentPath)) {
      console.log(`✗ ${file}: MISSING from current`);
      allMatch = false;
      results.push({ file, match: false, reason: 'Missing from current' });
      continue;
    }

    if (!existsSync(baselinePath)) {
      console.log(`✗ ${file}: MISSING from baseline`);
      allMatch = false;
      results.push({ file, match: false, reason: 'Missing from baseline' });
      continue;
    }

    const result = await compareImages(currentPath, baselinePath, diffPath, threshold);
    results.push({ file, ...result });

    if (result.match) {
      console.log(`✓ ${file}: MATCH (${result.diffPixels}/${result.totalPixels} pixels differ, ${(result.diffRatio * 100).toFixed(4)}%)`);
    } else {
      console.log(`✗ ${file}: MISMATCH (${result.diffPixels}/${result.totalPixels} pixels differ, ${(result.diffRatio * 100).toFixed(4)}% > ${(threshold * 100).toFixed(2)}%)`);
      if (result.reason) console.log(`    Reason: ${result.reason}`);
      allMatch = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.match).length;
  const failed = results.filter(r => !r.match).length;
  console.log(`Summary: ${passed} passed, ${failed} failed`);

  if (!allMatch) {
    console.log(`\nDiff images saved to: ${DIFF_DIR}`);
    console.log('Run with --update to accept current screenshots as new baselines.');
    process.exit(1);
  } else {
    console.log('\n✓ All screenshots match baselines');
    // Clean up diff directory on success
    if (existsSync(DIFF_DIR)) {
      rmSync(DIFF_DIR, { recursive: true, force: true });
    }
  }
}

async function main() {
  const { update, threshold } = parseArgs();

  if (update) {
    await updateBaselines();
  } else {
    await runComparison(threshold);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(2);
});