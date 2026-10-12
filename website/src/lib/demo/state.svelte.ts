import type { OptionValue } from './demo-args';
import {
  demoOptions,
  groups,
  leftEntries,
  rightEntries,
  type DemoFileEntry,
  type DemoOption
} from './mock-data';

export interface DemoSession {
  id: string;
  startedAt: number;
  exitCode: number | null;
  lines: { stream: 'stdout' | 'stderr'; text: string }[];
}

/**
 * Demo-only state container mirroring the app's src/lib/state/app.svelte.ts,
 * backed by static mock data instead of the Tauri IPC layer.
 */
class DemoState {
  // Theme
  theme = $state<'light' | 'dark' | 'system'>('system');

  // Files
  leftDir = 'P:\\videos\\clip';
  rightDir = 'P:\\videos\\encode-test';
  leftEntries = $state<DemoFileEntry[]>(leftEntries);
  rightEntries = $state<DemoFileEntry[]>(rightEntries);
  leftShowAll = $state(false);
  rightShowAll = $state(false);
  leftFile = $state<string | null>(leftEntries[0].path);
  rightFile = $state<string | null>(rightEntries[0].path);

  // Options
  optionValues = $state<Record<string, OptionValue>>({});
  activeGroup = $state('quick');
  searchQuery = $state('');

  // Log panel (always visible in the demo, mirroring the app)
  sessions = $state<DemoSession[]>([
    {
      id: 'demo-session',
      startedAt: Date.now() - 42_000,
      exitCode: null,
      lines: [
        { stream: 'stdout', text: 'video-compare 2025-01-01 — pid 4321' },
        { stream: 'stdout', text: 'reference : P:\\videos\\clip\\take2.mkv' },
        { stream: 'stdout', text: 'distorted : P:\\videos\\encode-test\\take2-h264.mp4' },
        { stream: 'stdout', text: 'window ready (1920x1080) — press ? for keyboard help' }
      ]
    }
  ]);
  activeSessionId = $state<string | null>('demo-session');

  get activeSession(): DemoSession | null {
    return this.sessions.find((s) => s.id === this.activeSessionId) ?? null;
  }

  /** Mirrors the app: the output panel only shows once a session produced logs. */
  get hasVideoCompareOutput(): boolean {
    return this.sessions.some((s) => s.lines.length > 0);
  }

  get profile() {
    return { groups, options: demoOptions };
  }

  visibleEntries(side: 'left' | 'right'): DemoFileEntry[] {
    const entries = side === 'left' ? this.leftEntries : this.rightEntries;
    const showAll = side === 'left' ? this.leftShowAll : this.rightShowAll;
    return showAll ? entries : entries.filter((e) => e.is_video);
  }

  selectedPath(side: 'left' | 'right'): string | null {
    return side === 'left' ? this.leftFile : this.rightFile;
  }

  selectFile(side: 'left' | 'right', path: string) {
    if (side === 'left') this.leftFile = path;
    else this.rightFile = path;
  }

  toggleShowAll(side: 'left' | 'right') {
    if (side === 'left') this.leftShowAll = !this.leftShowAll;
    else this.rightShowAll = !this.rightShowAll;
  }

  swapLeftRight() {
    const l = this.leftFile;
    this.leftFile = this.rightFile;
    this.rightFile = l;
  }

  setOption(id: string, value: OptionValue) {
    this.optionValues = { ...this.optionValues, [id]: value };
  }

  resetOption(id: string) {
    const next = { ...this.optionValues };
    delete next[id];
    this.optionValues = next;
  }

  applyTheme(theme: 'light' | 'dark' | 'system') {
    this.theme = theme;
    let effective: 'light' | 'dark';
    if (theme === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effective = theme;
    }
    document.documentElement.setAttribute('data-theme', effective);
    try {
      if (theme === 'system') localStorage.removeItem('vc-theme');
      else localStorage.setItem('vc-theme', theme);
    } catch {
      /* storage unavailable */
    }
  }

  /** Simulate launching: append a fresh fake session with canned output. */
  launch(command: string) {
    const id = `demo-${this.sessions.length + 1}`;
    const lines: { stream: 'stdout' | 'stderr'; text: string }[] = [
      { stream: 'stdout', text: `video-compare 2025-01-01 — pid ${1000 + this.sessions.length}` },
      { stream: 'stdout', text: `command: ${command}` },
      { stream: 'stdout', text: `reference : ${this.leftFile ?? ''}` },
      { stream: 'stdout', text: `distorted : ${this.rightFile ?? ''}` },
      { stream: 'stderr', text: 'demo mode: no real process was started' },
      { stream: 'stdout', text: 'window ready — press ? for keyboard help' }
    ];
    this.sessions = [...this.sessions, { id, startedAt: Date.now(), exitCode: null, lines }];
    this.activeSessionId = id;
  }

  formatOption(id: string): string | null {
    const spec: DemoOption | undefined = demoOptions.find((o) => o.id === id);
    const v = this.optionValues[id];
    if (!spec || !v) return null;
    const nonEmpty = (x: unknown) => x !== undefined && x !== null && x !== '' && x !== false;
    if (spec.appliesTo === 'pair' && v.linked === false) {
      const l = nonEmpty(v.leftValue) ? String(v.leftValue) : '—';
      const r = nonEmpty(v.rightValue) ? String(v.rightValue) : '—';
      if (!nonEmpty(v.leftValue) && !nonEmpty(v.rightValue)) return null;
      return `L=${l} R=${r}`;
    }
    if (!nonEmpty(v.value)) return null;
    return String(v.value);
  }
}

export const demo = new DemoState();
