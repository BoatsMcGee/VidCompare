import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';

vi.mock('../ipc', () => ({
  ipc: { listMediaFiles: vi.fn(), describePath: vi.fn() },
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: () => ({ onDragDropEvent: vi.fn(() => Promise.resolve(() => {})) }),
}));

import FilePanel from './FilePanel.svelte';
import { ipc } from '../ipc';
import { appState } from '../state/app.svelte';
import { resetAppState, makeEntry } from '../test-utils';
import { expectNoAxeViolations } from '../test-a11y';

const listMediaFiles = vi.mocked(ipc.listMediaFiles);

beforeEach(() => {
  resetAppState();
  listMediaFiles.mockReset();
  listMediaFiles.mockResolvedValue([]);
});

afterEach(cleanup);

describe('FilePanel accessibility', () => {
  it('has no axe violations in the empty state', async () => {
    const { container } = render(FilePanel, { props: { side: 'left' } });
    await expectNoAxeViolations(container);
  });

  it('has no axe violations with a populated file list', async () => {
    appState.leftDir = 'C:\\clips';
    appState.leftEntries = [
      makeEntry('a.mp4', { size: 1024 }),
      makeEntry('b.mkv', { size: 2 * 1024 * 1024 }),
    ];
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    const { container } = render(FilePanel, { props: { side: 'left' } });
    await expectNoAxeViolations(container);
    expect(screen.getByText('a.mp4')).toBeTruthy();
  });

  it('has no axe violations on the right panel', async () => {
    appState.rightDir = 'D:\\vid';
    appState.rightEntries = [makeEntry('r.mp4')];
    const { container } = render(FilePanel, { props: { side: 'right' } });
    await expectNoAxeViolations(container);
  });
});
