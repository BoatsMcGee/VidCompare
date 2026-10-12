import type { OptionProfile } from '../options/profile';
import type { BuildState, InputFile, OptionValue } from '../options/args';
import type { FileEntry, Settings } from '../ipc';

export interface LaunchSession {
  id: string;
  binary: string;
  args: string[];
  startedAt: number;
  exitCode: number | null;
  lines: { stream: 'stdout' | 'stderr'; text: string }[];
}

class AppState {
  // Files
  leftFile = $state<InputFile | null>(null);
  rightFiles = $state<InputFile[]>([]);
  leftDir = $state<string>('');
  rightDir = $state<string>('');
  leftEntries = $state<FileEntry[]>([]);
  rightEntries = $state<FileEntry[]>([]);
  leftShowAll = $state(false);
  rightShowAll = $state(false);

  // Options
  optionValues = $state<Record<string, OptionValue>>({});
  activeGroup = $state('quick');
  searchQuery = $state('');

  // Profile
  profile = $state<OptionProfile | null>(null);
  profileId = $state<string>('');

  // Settings
  settings = $state<Settings | null>(null);
  theme = $state<'light' | 'dark' | 'system'>('system');

  // Launch
  sessions = $state<LaunchSession[]>([]);
  activeSessionId = $state<string | null>(null);

  // UI
  showSettings = $state(false);
  view = $state<'setup' | 'compare'>('setup');

  get buildState(): BuildState {
    return {
      left: this.leftFile,
      rights: this.rightFiles,
      options: this.optionValues,
    };
  }

  get activeSession(): LaunchSession | null {
    return this.sessions.find((s) => s.id === this.activeSessionId) ?? null;
  }

  /** video-compare output exists to show (hidden until launched with logs). */
  get hasVideoCompareOutput(): boolean {
    return this.sessions.some((s) => s.lines.length > 0);
  }

  setOption(id: string, value: OptionValue) {
    this.optionValues = { ...this.optionValues, [id]: value };
  }

  resetOption(id: string) {
    const next = { ...this.optionValues };
    delete next[id];
    this.optionValues = next;
  }

  addRightFile() {
    this.rightFiles = [...this.rightFiles, { path: '' }];
  }

  removeRightFile(index: number) {
    this.rightFiles = this.rightFiles.filter((_, i) => i !== index);
  }

  swapLeftRight() {
    const left = this.leftFile;
    const right = this.rightFiles[0] ?? null;
    this.leftFile = right;
    this.rightFiles = left ? [left, ...this.rightFiles.slice(1)] : this.rightFiles.slice(1);

    // Swap everything else that is side-scoped so the UI stays consistent
    // with the command: folders, listings, filters, and per-side option values.
    const leftDir = this.leftDir;
    this.leftDir = this.rightDir;
    this.rightDir = leftDir;

    const leftEntries = this.leftEntries;
    this.leftEntries = this.rightEntries;
    this.rightEntries = leftEntries;

    const leftShowAll = this.leftShowAll;
    this.leftShowAll = this.rightShowAll;
    this.rightShowAll = leftShowAll;

    const swapped: Record<string, OptionValue> = {};
    for (const [id, v] of Object.entries(this.optionValues)) {
      if (v && typeof v === 'object' && ('leftValue' in v || 'rightValue' in v)) {
        swapped[id] = { ...v, leftValue: v.rightValue, rightValue: v.leftValue };
      } else {
        swapped[id] = v;
      }
    }
    this.optionValues = swapped;
  }
}

export const appState = new AppState();
