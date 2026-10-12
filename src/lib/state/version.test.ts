import { describe, it, expect } from 'vitest';
import { extractVersionToken, profileMatchesBinary } from './version';

describe('extractVersionToken', () => {
  it('extracts a full date from binary --version output', () => {
    expect(extractVersionToken('video-compare version 2025-06-01')).toBe('2025-06-01');
  });
  it('extracts month precision', () => {
    expect(extractVersionToken('2025-06')).toBe('2025-06');
  });
  it('extracts compact dates like 20261004', () => {
    expect(extractVersionToken('video-compare 20261004-osaka')).toBe('20261004');
  });
  it('extracts semver-like versions', () => {
    expect(extractVersionToken('version 1.2.3 (build)')).toBe('1.2.3');
  });
  it('returns null when nothing looks like a version', () => {
    expect(extractVersionToken('unknown build')).toBeNull();
  });
});

describe('profileMatchesBinary', () => {
  it('matches identical versions', () => {
    expect(profileMatchesBinary('video-compare version 2025-01-01', '2025-01-01')).toBe(true);
  });
  it('detects a mismatch between binary and profile', () => {
    expect(profileMatchesBinary('video-compare version 2025-06-01', '2025-01-01')).toBe(false);
  });
  it('matches month-precision profile against full binary date in same month', () => {
    expect(profileMatchesBinary('video-compare version 2025-06-01', '2025-06')).toBe(true);
  });
  it('does not match different months at month precision', () => {
    expect(profileMatchesBinary('video-compare version 2025-07-01', '2025-06')).toBe(false);
  });
  it('falls back to substring match when only upstream has a token', () => {
    expect(profileMatchesBinary('no version reported', '2025-01-01')).toBe(false);
    expect(profileMatchesBinary('contains 2025-01-01 marker', '2025-01-01')).toBe(true);
  });
  it('compares raw strings when neither side has a token', () => {
    expect(profileMatchesBinary('dev', 'dev')).toBe(true);
    expect(profileMatchesBinary('dev', 'release')).toBe(false);
  });
  it('matches compact binary date against dashed profile date of the same day', () => {
    expect(profileMatchesBinary('video-compare 20261004-osaka', '2026-10-04')).toBe(true);
    expect(profileMatchesBinary('video-compare 20261004-osaka', '2026-10-05')).toBe(false);
  });
  it('matches compact date on both sides', () => {
    expect(profileMatchesBinary('video-compare 20261004-osaka', '20261004')).toBe(true);
  });
});
