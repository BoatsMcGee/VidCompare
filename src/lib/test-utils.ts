import type { OptionProfile } from './options/profile';
import { appState } from './state/app.svelte';

/**
 * Shared fixtures/helpers for unit + component tests.
 * Excluded from coverage (see vite.config.ts coverage.exclude).
 */

export function makeProfile(): OptionProfile {
  return {
    profileVersion: 1,
    minAppVersion: '0.1.0',
    upstream: { version: '2025-01-01' },
    inputs: {
      multiRight: true,
      sameFilePlaceholder: '__',
      perVideoOverrideSyntax: '::',
      maxRightVideos: 10,
    },
    groups: [
      { id: 'quick', label: 'Quick', order: 0 },
      { id: 'io', label: 'Inputs & Decoding', order: 1 },
    ],
    options: [
      {
        id: 'display-mode',
        flag: '--mode',
        label: 'Display mode',
        help: 'Layout mode.',
        group: 'quick',
        order: 10,
        appliesTo: 'global',
        type: {
          kind: 'enum',
          values: [
            { value: 'split', label: 'Split' },
            { value: 'vstack', label: 'Vertical stack' },
          ],
        },
      },
      {
        id: 'fullscreen',
        flag: '--fullscreen',
        label: 'Fullscreen',
        help: 'Start fullscreen.',
        group: 'quick',
        order: 20,
        appliesTo: 'global',
        type: { kind: 'bool' },
      },
      {
        id: 'time-shift',
        flag: '--time-shift',
        label: 'Time shift',
        help: 'Shift the right video timestamps.',
        group: 'quick',
        order: 30,
        appliesTo: 'global',
        type: { kind: 'string', placeholder: '0.1' },
      },
      {
        id: 'ui-scale',
        flag: '--ui-scale',
        label: 'UI scale',
        help: 'Scale multiplier.',
        group: 'quick',
        order: 40,
        appliesTo: 'global',
        type: { kind: 'number', min: 0.5, max: 4 },
      },
      {
        id: 'decoder',
        flags: { both: '--decoder', left: '--left-decoder', right: '--right-decoder' },
        label: 'Decoder',
        help: 'Decoder selection.',
        group: 'io',
        order: 10,
        appliesTo: 'pair',
        pairStyle: 'separateFlags',
        type: { kind: 'string', placeholder: 'auto' },
      },
      {
        id: 'color-range',
        flag: '--color-range',
        label: 'Color range',
        help: 'Color range for both sides.',
        group: 'io',
        order: 20,
        appliesTo: 'pair',
        pairStyle: 'colon',
        type: { kind: 'string' },
      },
      {
        id: 'left-filters',
        flags: { left: '--left-filters' },
        label: 'Left filters',
        help: 'Filters for the left video.',
        group: 'io',
        order: 30,
        appliesTo: 'left',
        type: { kind: 'string' },
      },
      {
        id: 'right-filters',
        flags: { right: '--right-filters' },
        label: 'Right filters',
        help: 'Filters for the right video.',
        group: 'io',
        order: 40,
        appliesTo: 'right',
        type: { kind: 'string' },
      },
    ],
  };
}

/** Reset the appState singleton to a known baseline between tests. */
export function resetAppState(): void {
  appState.leftFile = null;
  appState.rightFiles = [];
  appState.leftDir = '';
  appState.rightDir = '';
  appState.leftEntries = [];
  appState.rightEntries = [];
  appState.leftShowAll = false;
  appState.rightShowAll = false;
  appState.optionValues = {};
  appState.activeGroup = 'quick';
  appState.searchQuery = '';
  appState.profile = makeProfile();
  appState.profileId = 'test-profile';
  appState.settings = null;
  appState.theme = 'system';
  appState.sessions = [];
  appState.activeSessionId = null;
  appState.showSettings = false;
}

export function makeEntry(
  name: string,
  opts: Partial<{ size: number; ext: string; is_video: boolean }> = {},
) {
  return {
    name,
    path: `C:\\clips\\${name}`,
    size: opts.size ?? 1024,
    mtime: null,
    ext: opts.ext ?? name.split('.').pop() ?? '',
    is_video: opts.is_video ?? true,
  };
}
