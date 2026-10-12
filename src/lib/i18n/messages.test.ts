import { describe, it, expect } from 'vitest';
import { t, messages } from './messages';

describe('messages dictionary', () => {
  it('resolves nested keys', () => {
    expect(t('app.title')).toBe('VidCompare');
    expect(t('compare.title')).toBe('Compare');
  });

  it('interpolates params', () => {
    expect(t('banner.versionMismatch', { binary: '20261004', profile: '2025-01-01' })).toContain(
      '20261004',
    );
  });

  it('returns the key for unknown paths', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('every leaf is a non-empty string', () => {
    const leaves: string[] = [];
    const walk = (obj: unknown, path: string) => {
      if (typeof obj === 'string') {
        leaves.push(path);
        return;
      }
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        walk(v, `${path}.${k}`);
      }
    };
    walk(messages, '');
    expect(leaves.length).toBeGreaterThan(30);
    for (const leaf of leaves) {
      const value = t(leaf.replace(/^\./, ''));
      expect(value, leaf).not.toBe(leaf);
      expect(value.length, leaf).toBeGreaterThan(0);
    }
  });
});
