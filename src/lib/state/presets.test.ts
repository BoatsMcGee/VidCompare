import { describe, it, expect } from 'vitest';
import {
  MAX_PRESETS,
  PRESETS_STORAGE_KEY,
  deletePreset,
  getPreset,
  loadPresets,
  parsePresets,
  renamePreset,
  savePreset,
  serializePresets,
  type Preset,
  type StorageLike,
} from './presets';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

function makePreset(name: string, updatedAt = 0): Preset {
  return {
    name,
    options: { mode: { value: 'vstack' } },
    left: { path: 'left.mp4' },
    rights: [{ path: 'right.mp4' }],
    updatedAt,
  };
}

describe('parsePresets', () => {
  it('returns empty list for null, bad JSON and non-arrays', () => {
    expect(parsePresets(null)).toEqual([]);
    expect(parsePresets('not json')).toEqual([]);
    expect(parsePresets('{"a":1}')).toEqual([]);
  });

  it('drops invalid entries and trims/dedups names', () => {
    const raw = JSON.stringify([
      { name: '  ok  ', options: { mode: { value: 'split' } } },
      { name: 'ok', options: {} }, // duplicate after trim -> dropped
      { name: '', options: {} }, // empty -> dropped
      { name: 42, options: {} }, // wrong type -> dropped
      'junk',
      { name: 'files', options: {}, left: { path: 'a.mp4' }, rights: [{ path: 'b.mp4' }] },
    ]);
    const parsed = parsePresets(raw);
    expect(parsed.map((p) => p.name)).toEqual(['ok', 'files']);
    expect(parsed[0].options).toEqual({ mode: { value: 'split' } });
    expect(parsed[1].left).toEqual({ path: 'a.mp4' });
    expect(parsed[1].rights).toEqual([{ path: 'b.mp4' }]);
  });

  it('caps lists at MAX_PRESETS', () => {
    const raw = JSON.stringify(
      Array.from({ length: MAX_PRESETS + 10 }, (_, i) => makePreset(`p${i}`)),
    );
    expect(parsePresets(raw)).toHaveLength(MAX_PRESETS);
  });

  it('round-trips through serialize', () => {
    const presets = [makePreset('a', 123), makePreset('b', 456)];
    expect(parsePresets(serializePresets(presets))).toEqual(presets);
  });
});

describe('loadPresets', () => {
  it('reads from storage and tolerates storage errors', () => {
    const storage = memoryStorage();
    expect(loadPresets(storage)).toEqual([]);
    storage.setItem(PRESETS_STORAGE_KEY, serializePresets([makePreset('x')]));
    expect(loadPresets(storage).map((p) => p.name)).toEqual(['x']);

    const broken: StorageLike = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {},
    };
    expect(loadPresets(broken)).toEqual([]);
  });
});

describe('savePreset', () => {
  it('rejects empty names without touching storage', () => {
    const storage = memoryStorage();
    const res = savePreset([], { name: '   ', options: {}, left: null, rights: [] }, storage);
    expect(res.error).toBeTruthy();
    expect(res.presets).toHaveLength(0);
    expect(storage.data.has(PRESETS_STORAGE_KEY)).toBe(false);
  });

  it('appends a new preset and persists it', () => {
    const storage = memoryStorage();
    const res = savePreset(
      [],
      { name: ' HDR ', options: { mode: { value: 'split' } }, left: { path: 'l.mp4' }, rights: [] },
      storage,
      999,
    );
    expect(res.error).toBeUndefined();
    expect(res.presets).toHaveLength(1);
    expect(res.presets[0]).toMatchObject({ name: 'HDR', updatedAt: 999, left: { path: 'l.mp4' } });
    expect(loadPresets(storage)[0].name).toBe('HDR');
  });

  it('overwrites an existing preset with the same name', () => {
    const storage = memoryStorage();
    let res = savePreset(
      [],
      { name: 'a', options: { mode: { value: 'split' } }, left: null, rights: [] },
      storage,
    );
    res = savePreset(
      res.presets,
      { name: 'a', options: { mode: { value: 'hstack' } }, left: null, rights: [] },
      storage,
    );
    expect(res.presets).toHaveLength(1);
    expect(res.presets[0].options.mode).toEqual({ value: 'hstack' });
  });

  it('enforces the MAX_PRESETS cap for new names', () => {
    const storage = memoryStorage();
    const full = Array.from({ length: MAX_PRESETS }, (_, i) => makePreset(`p${i}`));
    const res = savePreset(
      full,
      { name: 'one too many', options: {}, left: null, rights: [] },
      storage,
    );
    expect(res.error).toContain(String(MAX_PRESETS));
    expect(res.presets).toHaveLength(MAX_PRESETS);
    expect(loadPresets(storage)).toHaveLength(0); // nothing written
  });

  it('still allows overwriting at the cap', () => {
    const storage = memoryStorage();
    const full = Array.from({ length: MAX_PRESETS }, (_, i) => makePreset(`p${i}`));
    const res = savePreset(full, { name: 'p0', options: {}, left: null, rights: [] }, storage);
    expect(res.error).toBeUndefined();
    expect(res.presets).toHaveLength(MAX_PRESETS);
    expect(loadPresets(storage)).toHaveLength(MAX_PRESETS);
  });
});

describe('renamePreset', () => {
  it('renames and persists', () => {
    const storage = memoryStorage();
    const res = renamePreset([makePreset('old')], 'old', 'new', storage);
    expect(res.error).toBeUndefined();
    expect(res.presets[0].name).toBe('new');
    expect(loadPresets(storage)[0].name).toBe('new');
  });

  it('rejects renaming to an existing name', () => {
    const storage = memoryStorage();
    const res = renamePreset([makePreset('a'), makePreset('b')], 'a', 'b', storage);
    expect(res.error).toContain('already exists');
    expect(res.presets[0].name).toBe('a');
  });

  it('rejects missing source and empty target', () => {
    const storage = memoryStorage();
    expect(renamePreset([makePreset('a')], 'nope', 'x', storage).error).toContain('not found');
    expect(renamePreset([makePreset('a')], 'a', '  ', storage).error).toBeTruthy();
  });
});

describe('deletePreset / getPreset', () => {
  it('deletes by name and persists', () => {
    const storage = memoryStorage();
    storage.setItem(PRESETS_STORAGE_KEY, serializePresets([makePreset('a'), makePreset('b')]));
    const next = deletePreset(loadPresets(storage), 'a', storage);
    expect(next.map((p) => p.name)).toEqual(['b']);
    expect(loadPresets(storage).map((p) => p.name)).toEqual(['b']);
  });

  it('no-op delete leaves storage untouched', () => {
    const storage = memoryStorage();
    const presets = [makePreset('a')];
    storage.setItem(PRESETS_STORAGE_KEY, serializePresets(presets));
    expect(deletePreset(presets, 'missing', storage)).toHaveLength(1);
    expect(loadPresets(storage)).toHaveLength(1);
  });

  it('getPreset finds or returns null', () => {
    const presets = [makePreset('a')];
    expect(getPreset(presets, 'a')?.name).toBe('a');
    expect(getPreset(presets, 'zz')).toBeNull();
  });
});
