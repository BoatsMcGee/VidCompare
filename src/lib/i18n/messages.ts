/**
 * UI string dictionary (i18n pass, M9).
 *
 * English first; the structure is ready for translations — swap the export
 * for a locale-keyed lookup without touching components. Keys are grouped by
 * component/feature. Interpolation uses {placeholders}.
 */

export const messages = {
  app: {
    title: 'VidCompare',
    logs: 'Logs',
    settings: 'Settings',
  },
  banner: {
    versionMismatch: 'video-compare {binary} differs from profile {profile} — some options may be missing.',
    downloadProfiles: 'Download profiles…',
    dismiss: 'Dismiss',
  },
  filePanel: {
    left: 'Left',
    right: 'Right',
    browse: 'Browse…',
    showAll: 'Show all files',
    empty: 'Click to browse, or drop a file or folder here.',
    pathPlaceholder: 'Folder…',
    folderPath: 'Folder path',
    pathInvalid: 'Folder not found.',
  },
  presets: {
    label: 'Presets:',
    save: 'Save',
    newName: 'New preset name…',
    confirmRename: 'Confirm rename',
    cancelRename: 'Cancel rename',
    apply: 'Apply preset',
    remove: 'Remove preset',
    nameRequired: 'Preset name is required.',
  },
  compare: {
    title: 'Compare',
    start: '▶ Compare',
    starting: 'Starting…',
    embedded: 'embedded',
    exited: 'video-compare exited',
    surfaceRole: 'Embedded video-compare window',
    readyHint: 'video-compare will run embedded here — full keyboard shortcuts supported.',
    needBothFiles: 'Select both a left and a right file to compare.',
    external: 'Open in separate window',
  },
  options: {
    search: '🔍 Search options…',
    findFilters: 'Find filters',
    findDecoders: 'Find decoders',
    link: 'Link L/R',
    unlink: 'Unlink L/R',
    shared: 'Shared',
  },
  findHelper: {
    search: 'Search',
    close: 'Close',
    searchTerm: 'Search term',
    searchTermPlaceholder: 'Search term…',
    find: 'Find {kind}',
  },
  activeChips: {
    label: 'Active:',
  },
  command: {
    copy: 'Copy command',
    launch: '▶ Launch',
  },
  logs: {
    output: 'Output',
    empty: 'No active session.',
    running: '(running)',
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    theme: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    binarySection: 'video-compare binary',
    binaryDefault: 'Default (bundled sidecar or PATH)',
    browse: 'Browse…',
    useDefault: 'Use default',
    detected: 'Detected: {version} — {path} ({source})',
    profileSection: 'Option profile',
    embeddedProfile: 'Embedded default',
    profileFile: 'Profile file',
    noProfileFile: 'No profile file selected — using the embedded default profile.',
    close: 'Close',
  },
} as const;

/** Look up a message; interpolates {placeholders} from params. */
export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const walk = (obj: unknown, path: string[]): string | undefined => {
    if (typeof obj === 'string') return obj;
    if (obj && typeof obj === 'object') {
      const [head, ...rest] = path;
      return walk((obj as Record<string, unknown>)[head], rest);
    }
    return undefined;
  };
  let text = walk(messages, key.split('.'));
  if (text === undefined) return key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
