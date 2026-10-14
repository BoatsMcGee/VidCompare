import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/svelte';
import { tick } from 'svelte';

const onDragDropEvent = vi.fn(() => Promise.resolve(() => undefined));
vi.mock('../ipc', () => ({
  ipc: { listMediaFiles: vi.fn(), describePath: vi.fn() },
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: () => ({ onDragDropEvent }),
}));

import FilePanel from './FilePanel.svelte';
import { ipc } from '../ipc';
import { open } from '@tauri-apps/plugin-dialog';
import { appState } from '../state/app.svelte';
import { resetAppState, makeEntry } from '../test-utils';

const listMediaFiles = vi.mocked(ipc.listMediaFiles);
const describePath = vi.mocked(ipc.describePath);
const openDialog = vi.mocked(open);

beforeEach(() => {
  resetAppState();
  listMediaFiles.mockReset();
  describePath.mockReset();
  openDialog.mockReset();
  onDragDropEvent.mockClear();
});

afterEach(cleanup);

function dirInput(): HTMLInputElement {
  return screen.getByLabelText('Folder path') as HTMLInputElement;
}

describe('FilePanel', () => {
  it('shows the empty state when no folder is selected', () => {
    render(FilePanel, { props: { side: 'left' } });
    expect(screen.getByText(/drop a file or folder/i)).toBeTruthy();
  });

  it('lists sibling entries with formatted sizes', () => {
    appState.leftDir = 'C:\\clips';
    appState.leftEntries = [
      makeEntry('tiny.mp4', { size: 512 }),
      makeEntry('small.mkv', { size: 2048 }),
      makeEntry('mid.mp4', { size: 3 * 1024 * 1024 }),
      makeEntry('big.mp4', { size: 2 * 1024 * 1024 * 1024 }),
    ];
    render(FilePanel, { props: { side: 'left' } });
    expect(screen.getByText('tiny.mp4')).toBeTruthy();
    expect(screen.getByText('512 B')).toBeTruthy();
    expect(screen.getByText('2.0 KB')).toBeTruthy();
    expect(screen.getByText('3.0 MB')).toBeTruthy();
    expect(screen.getByText('2.0 GB')).toBeTruthy();
    expect(dirInput().value).toBe('C:\\clips');
  });

  it('marks the selected entry', () => {
    appState.leftDir = 'C:\\clips';
    appState.leftEntries = [makeEntry('a.mp4'), makeEntry('b.mp4')];
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    render(FilePanel, { props: { side: 'left' } });
    const buttons = screen.getAllByRole('button');
    const aBtn = buttons.find((b) => b.textContent?.includes('a.mp4'));
    const bBtn = buttons.find((b) => b.textContent?.includes('b.mp4'));
    expect(aBtn?.classList.contains('selected')).toBe(true);
    expect(bBtn?.classList.contains('selected')).toBe(false);
  });

  it('selecting a right-side entry replaces only the first right file', async () => {
    appState.rightDir = 'C:\\clips';
    appState.rightEntries = [makeEntry('b.mp4')];
    appState.rightFiles = [{ path: 'old.mp4' }, { path: 'keep.mp4' }];
    render(FilePanel, { props: { side: 'right' } });
    await fireEvent.click(screen.getByText('b.mp4'));
    expect(appState.rightFiles[0]).toEqual({ path: 'C:\\clips\\b.mp4' });
    expect(appState.rightFiles[1]).toEqual({ path: 'keep.mp4' });
  });

  it('selecting a left-side entry sets leftFile', async () => {
    appState.leftDir = 'C:\\clips';
    appState.leftEntries = [makeEntry('a.mp4')];
    render(FilePanel, { props: { side: 'left' } });
    await fireEvent.click(screen.getByText('a.mp4'));
    expect(appState.leftFile).toEqual({ path: 'C:\\clips\\a.mp4' });
  });

  it('show-all toggle reloads the listing with includeAll=true', async () => {
    appState.leftDir = 'C:\\clips';
    appState.leftEntries = [makeEntry('a.mp4')];
    listMediaFiles.mockResolvedValue([makeEntry('notes.txt', { is_video: false, ext: 'txt' })]);
    render(FilePanel, { props: { side: 'left' } });

    await fireEvent.click(screen.getByRole('checkbox'));
    expect(appState.leftShowAll).toBe(true);
    expect(listMediaFiles).toHaveBeenCalledWith('C:\\clips', true);

    await tick();
    expect(screen.getByText('notes.txt')).toBeTruthy();

    // Toggle back
    await fireEvent.click(screen.getByRole('checkbox'));
    expect(appState.leftShowAll).toBe(false);
    expect(listMediaFiles).toHaveBeenLastCalledWith('C:\\clips', false);
  });

  it('show-all state is independent per side', async () => {
    appState.rightDir = 'D:\\r';
    appState.rightEntries = [];
    listMediaFiles.mockResolvedValue([]);
    render(FilePanel, { props: { side: 'right' } });
    await fireEvent.click(screen.getByRole('checkbox'));
    expect(appState.rightShowAll).toBe(true);
    expect(appState.leftShowAll).toBe(false);
  });

  it('browses, stores the parent dir and reloads the listing', async () => {
    listMediaFiles.mockResolvedValue([makeEntry('picked.mp4')]);
    openDialog.mockResolvedValue('C:\\new\\picked.mp4');
    render(FilePanel, { props: { side: 'left' } });

    await fireEvent.click(screen.getByLabelText('Browse…'));
    await tick();

    expect(appState.leftDir).toBe('C:\\new');
    expect(appState.leftFile).toEqual({ path: 'C:\\new\\picked.mp4' });
    expect(listMediaFiles).toHaveBeenCalledWith('C:\\new', false);
    expect(screen.getByText('picked.mp4')).toBeTruthy();
  });

  it('browsing on the right side sets the right directory', async () => {
    listMediaFiles.mockResolvedValue([]);
    openDialog.mockResolvedValue('D:\\vid\\right.mp4');
    render(FilePanel, { props: { side: 'right' } });
    await fireEvent.click(screen.getByLabelText('Browse…'));
    await tick();
    expect(appState.rightDir).toBe('D:\\vid');
    expect(appState.rightFiles[0]).toEqual({ path: 'D:\\vid\\right.mp4' });
  });

  it('does nothing when the dialog is cancelled', async () => {
    openDialog.mockResolvedValue(undefined);
    render(FilePanel, { props: { side: 'left' } });
    await fireEvent.click(screen.getByLabelText('Browse…'));
    await tick();
    expect(listMediaFiles).not.toHaveBeenCalled();
    expect(appState.leftDir).toBe('');
  });

  it('clicking the list background opens the browse dialog', async () => {
    appState.leftDir = 'C:\\clips';
    appState.leftEntries = [makeEntry('a.mp4')];
    openDialog.mockResolvedValue(undefined);
    render(FilePanel, { props: { side: 'left' } });
    await fireEvent.click(screen.getByText('a.mp4').closest('.file-list') as HTMLElement);
    expect(openDialog).toHaveBeenCalledTimes(1);
  });

  it('clicking the empty state opens exactly one browse dialog', async () => {
    openDialog.mockResolvedValue(undefined);
    render(FilePanel, { props: { side: 'left' } });
    await fireEvent.click(screen.getByText('Click to browse, or drop a file or folder here.'));
    expect(openDialog).toHaveBeenCalledTimes(1);
  });

  it('committing a typed folder path reloads the listing', async () => {
    listMediaFiles.mockResolvedValue([makeEntry('x.mp4')]);
    render(FilePanel, { props: { side: 'left' } });
    await fireEvent.input(dirInput(), { target: { value: 'D:\\other' } });
    await fireEvent.keyDown(dirInput(), { key: 'Enter' });
    await tick();
    expect(appState.leftDir).toBe('D:\\other');
    expect(listMediaFiles).toHaveBeenCalledWith('D:\\other', false);
  });

  it('marks the path input invalid when the listing fails', async () => {
    listMediaFiles.mockRejectedValue(new Error('ENOENT'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(FilePanel, { props: { side: 'left' } });
    await fireEvent.input(dirInput(), { target: { value: 'Z:\\missing' } });
    await fireEvent.keyDown(dirInput(), { key: 'Enter' });
    await tick();
    expect(dirInput().classList.contains('error')).toBe(true);
    expect(dirInput().title).toMatch(/not found/i);
    err.mockRestore();
  });

  it('dropping a folder sets it as the panel directory', async () => {
    describePath.mockResolvedValue({ is_dir: true });
    listMediaFiles.mockResolvedValue([makeEntry('inside.mp4')]);
    render(FilePanel, { props: { side: 'left' } });
    const [dropHandler] = onDragDropEvent.mock.calls[0] as unknown as [(e: unknown) => void];
    dropHandler({ payload: { type: 'drop', paths: ['D:\\dropped'], position: { x: 0, y: 0 } } });
    await tick();
    await tick();
    expect(describePath).toHaveBeenCalledWith('D:\\dropped');
    expect(appState.leftDir).toBe('D:\\dropped');
    expect(listMediaFiles).toHaveBeenCalledWith('D:\\dropped', false);
  });

  it('dropping a file selects it and lists its parent folder', async () => {
    describePath.mockResolvedValue({ is_dir: false });
    listMediaFiles.mockResolvedValue([makeEntry('dropped.mp4')]);
    render(FilePanel, { props: { side: 'left' } });
    const [dropHandler] = onDragDropEvent.mock.calls[0] as unknown as [(e: unknown) => void];
    dropHandler({
      payload: { type: 'drop', paths: ['D:\\clips\\dropped.mp4'], position: { x: 0, y: 0 } },
    });
    await tick();
    await tick();
    expect(appState.leftFile).toEqual({ path: 'D:\\clips\\dropped.mp4' });
    expect(appState.leftDir).toBe('D:\\clips');
  });

  it('swallows listing errors without crashing', async () => {
    appState.leftDir = 'C:\\clips';
    listMediaFiles.mockRejectedValue(new Error('EACCES'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(FilePanel, { props: { side: 'left' } });
    await fireEvent.click(screen.getByRole('checkbox'));
    await tick();
    expect(appState.leftShowAll).toBe(true);
    err.mockRestore();
  });

  it('renders the right-side title and badge', () => {
    render(FilePanel, { props: { side: 'right' } });
    expect(screen.getByText('Right')).toBeTruthy();
    const panel = screen.getByText('Right').closest('.panel') as HTMLElement;
    expect(within(panel).getByText('R')).toBeTruthy();
  });
});
