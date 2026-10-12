import { describe, it, expect, beforeEach } from 'vitest';
import { appState } from './app.svelte';
import { resetAppState } from '../test-utils';

beforeEach(resetAppState);

describe('AppState', () => {
  it('buildState mirrors files and options', () => {
    appState.leftFile = { path: 'l.mp4' };
    appState.rightFiles = [{ path: 'r.mp4' }];
    appState.optionValues = { mode: { value: 'split' } };
    expect(appState.buildState).toEqual({
      left: { path: 'l.mp4' },
      rights: [{ path: 'r.mp4' }],
      options: { mode: { value: 'split' } },
    });
  });

  it('setOption merges, resetOption deletes', () => {
    appState.setOption('a', { value: 1 });
    appState.setOption('b', { value: 2 });
    expect(Object.keys(appState.optionValues)).toEqual(['a', 'b']);
    appState.resetOption('a');
    expect(appState.optionValues).toEqual({ b: { value: 2 } });
    expect(() => appState.resetOption('missing')).not.toThrow();
  });

  it('addRightFile appends, removeRightFile removes by index', () => {
    appState.addRightFile();
    appState.rightFiles = [{ path: 'a' }, { path: 'b' }, { path: 'c' }];
    appState.removeRightFile(1);
    expect(appState.rightFiles.map((r) => r.path)).toEqual(['a', 'c']);
    appState.removeRightFile(0);
    appState.removeRightFile(0);
    expect(appState.rightFiles).toEqual([]);
  });

  it('swapLeftRight exchanges the two sides', () => {
    appState.leftFile = { path: 'left' };
    appState.rightFiles = [{ path: 'right' }];
    appState.swapLeftRight();
    expect(appState.leftFile).toEqual({ path: 'right' });
    expect(appState.rightFiles).toEqual([{ path: 'left' }]);
  });

  it('swapLeftRight with empty right drops the left file into rights', () => {
    appState.leftFile = { path: 'left' };
    appState.rightFiles = [];
    appState.swapLeftRight();
    expect(appState.leftFile).toBeNull();
    expect(appState.rightFiles).toEqual([{ path: 'left' }]);
  });

  it('swapLeftRight with no left keeps remaining rights', () => {
    appState.leftFile = null;
    appState.rightFiles = [{ path: 'r1' }, { path: 'r2' }];
    appState.swapLeftRight();
    expect(appState.leftFile).toEqual({ path: 'r1' });
    expect(appState.rightFiles).toEqual([{ path: 'r2' }]);
  });

  it('swapLeftRight also swaps dirs, listings, filters, and side-scoped option values', () => {
    appState.leftFile = { path: 'C:\\a\\l.mp4' };
    appState.rightFiles = [{ path: 'C:\\b\\r.mp4' }];
    appState.leftDir = 'C:\\a';
    appState.rightDir = 'C:\\b';
    appState.leftEntries = [{ name: 'l.mp4', path: 'C:\\a\\l.mp4', size: 1, mtime: 0, ext: 'mp4', is_video: true }];
    appState.rightEntries = [{ name: 'r.mp4', path: 'C:\\b\\r.mp4', size: 2, mtime: 0, ext: 'mp4', is_video: true }];
    appState.leftShowAll = false;
    appState.rightShowAll = true;
    appState.optionValues = {
      shared: { value: 'keep' },
      crop: { value: '', leftValue: '100', rightValue: '200' },
    };

    appState.swapLeftRight();

    expect(appState.leftDir).toBe('C:\\b');
    expect(appState.rightDir).toBe('C:\\a');
    expect(appState.leftEntries[0].name).toBe('r.mp4');
    expect(appState.rightEntries[0].name).toBe('l.mp4');
    expect(appState.leftShowAll).toBe(true);
    expect(appState.rightShowAll).toBe(false);
    expect(appState.optionValues.shared).toEqual({ value: 'keep' });
    expect(appState.optionValues.crop).toEqual({ value: '', leftValue: '200', rightValue: '100' });
  });

  it('activeSession resolves from sessions and activeSessionId', () => {
    expect(appState.activeSession).toBeNull();
    appState.sessions = [
      { id: 's1', binary: 'b', args: [], startedAt: 1, exitCode: null, lines: [] },
      { id: 's2', binary: 'b', args: [], startedAt: 2, exitCode: 0, lines: [] },
    ];
    appState.activeSessionId = 's2';
    expect(appState.activeSession?.id).toBe('s2');
    appState.activeSessionId = 'nope';
    expect(appState.activeSession).toBeNull();
  });
});
