import type { InputFile, OptionValue } from '../options/args';

/**
 * Named presets: persisted snapshots of option values + selected files.
 *
 * Pure, storage-injected logic (no runes) so it is unit-testable;
 * `StorageLike` matches the subset of `localStorage` we use.
 */

export const MAX_PRESETS = 50;
export const PRESETS_STORAGE_KEY = 'vidcompare.presets.v1';

export interface Preset {
  name: string;
  options: Record<string, OptionValue>;
  left: InputFile | null;
  rights: InputFile[];
  updatedAt: number;
}

export interface PresetDraft {
  name: string;
  options: Record<string, OptionValue>;
  left: InputFile | null;
  rights: InputFile[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PresetResult {
  presets: Preset[];
  error?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseFile(v: unknown): InputFile | null {
  if (!isRecord(v) || typeof v.path !== 'string' || v.path === '') return null;
  const file: InputFile = { path: v.path };
  if (isRecord(v.overrides)) {
    const overrides: Record<string, string> = {};
    for (const [k, val] of Object.entries(v.overrides)) {
      if (typeof val === 'string') overrides[k] = val;
    }
    if (Object.keys(overrides).length > 0) file.overrides = overrides;
  }
  if (v.sameAsLeft === true) file.sameAsLeft = true;
  return file;
}

/** Lenient parse: bad JSON, invalid entries and over-cap lists are sanitized. */
export function parsePresets(raw: string | null): Preset[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const seen = new Set<string>();
  const out: Preset[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    if (typeof item.name !== 'string' || item.name.trim() === '') continue;
    const name = item.name.trim();
    if (seen.has(name)) continue;
    seen.add(name);
    const options: Record<string, OptionValue> = {};
    if (isRecord(item.options)) {
      for (const [id, val] of Object.entries(item.options)) {
        if (isRecord(val)) options[id] = val as OptionValue;
      }
    }
    out.push({
      name,
      options,
      left: parseFile(item.left),
      rights: Array.isArray(item.rights)
        ? item.rights.map(parseFile).filter((f): f is InputFile => f !== null)
        : [],
      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : 0,
    });
    if (out.length >= MAX_PRESETS) break;
  }
  return out;
}

export function serializePresets(presets: Preset[]): string {
  return JSON.stringify(presets.slice(0, MAX_PRESETS));
}

export function loadPresets(storage: StorageLike): Preset[] {
  try {
    return parsePresets(storage.getItem(PRESETS_STORAGE_KEY));
  } catch {
    return [];
  }
}

function writePresets(presets: Preset[], storage: StorageLike): void {
  try {
    storage.setItem(PRESETS_STORAGE_KEY, serializePresets(presets));
  } catch {
    // Storage unavailable/quota exceeded — keep in-memory state as-is.
  }
}

/** Save (insert or overwrite by exact name) and persist. */
export function savePreset(
  presets: Preset[],
  draft: PresetDraft,
  storage: StorageLike,
  now: number = Date.now(),
): PresetResult {
  const name = draft.name.trim();
  if (!name) return { presets, error: 'Preset name is required.' };

  const preset: Preset = {
    name,
    options: { ...draft.options },
    left: draft.left ? { ...draft.left } : null,
    rights: draft.rights.map((r) => ({ ...r })),
    updatedAt: now,
  };

  const index = presets.findIndex((p) => p.name === name);
  if (index === -1 && presets.length >= MAX_PRESETS) {
    return { presets, error: `Preset limit reached (${MAX_PRESETS}). Delete one first.` };
  }
  const next = [...presets];
  if (index === -1) next.push(preset);
  else next[index] = preset;
  writePresets(next, storage);
  return { presets: next };
}

export function renamePreset(
  presets: Preset[],
  name: string,
  newName: string,
  storage: StorageLike,
): PresetResult {
  const from = name.trim();
  const to = newName.trim();
  if (!to) return { presets, error: 'Preset name is required.' };
  const index = presets.findIndex((p) => p.name === from);
  if (index === -1) return { presets, error: `Preset "${from}" not found.` };
  if (to !== from && presets.some((p) => p.name === to)) {
    return { presets, error: `A preset named "${to}" already exists.` };
  }
  const next = [...presets];
  next[index] = { ...next[index], name: to };
  writePresets(next, storage);
  return { presets: next };
}

export function deletePreset(presets: Preset[], name: string, storage: StorageLike): Preset[] {
  const next = presets.filter((p) => p.name !== name);
  if (next.length !== presets.length) writePresets(next, storage);
  return next;
}

export function getPreset(presets: Preset[], name: string): Preset | null {
  return presets.find((p) => p.name === name) ?? null;
}
