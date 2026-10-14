/** Shared theme state for the website: system → light → dark cycle, persisted in localStorage. */

export type ThemeSetting = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'vc-theme';
const ORDER: ThemeSetting[] = ['system', 'light', 'dark'];

let setting = $state<ThemeSetting>('system');
let resolved = $state<ResolvedTheme>('light');

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStored(): ThemeSetting {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

function apply() {
  resolved = setting === 'system' ? systemTheme() : setting;
  document.documentElement.setAttribute('data-theme', resolved);
}

/** Call once on mount (layout). Returns cleanup for the media listener. */
export function initTheme(): () => void {
  setting = readStored();
  apply();
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (setting === 'system') apply();
  };
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function cycleTheme() {
  setting = ORDER[(ORDER.indexOf(setting) + 1) % ORDER.length];
  try {
    localStorage.setItem(STORAGE_KEY, setting);
  } catch {
    /* ignore */
  }
  apply();
}

export function getThemeSetting(): ThemeSetting {
  return setting;
}

export function getResolvedTheme(): ResolvedTheme {
  return resolved;
}
