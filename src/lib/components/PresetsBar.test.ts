import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

vi.mock('../ipc', () => ({
  ipc: { listMediaFiles: vi.fn() },
}));

import PresetsBar from './PresetsBar.svelte';
import { ipc } from '../ipc';
import { appState } from '../state/app.svelte';
import { resetAppState, makeEntry } from '../test-utils';
import { PRESETS_STORAGE_KEY } from '../state/presets';

const listMediaFiles = vi.mocked(ipc.listMediaFiles);

beforeEach(() => {
  resetAppState();
  localStorage.clear();
  listMediaFiles.mockReset();
  listMediaFiles.mockResolvedValue([]);
});

afterEach(cleanup);

const nameInput = () => screen.getByPlaceholderText('New preset name…');

describe('PresetsBar', () => {
  it('starts empty with a name input and save button', () => {
    render(PresetsBar);
    expect(screen.getByText('Presets:')).toBeTruthy();
    expect(nameInput()).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(document.querySelector('.error')).toBeNull();
  });

  it('rejects an empty preset name', async () => {
    render(PresetsBar);
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(document.querySelector('.error')!.textContent).toBe('Preset name is required.');
    expect(localStorage.getItem(PRESETS_STORAGE_KEY)).toBeNull();
  });

  it('saves the current state as a preset and persists it', async () => {
    appState.optionValues['fullscreen'] = { linked: true, value: true };
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
    render(PresetsBar);

    await fireEvent.input(nameInput(), { target: { value: '  My preset  ' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByTitle('Apply preset').textContent).toBe('My preset'); // trimmed
    expect(nameInput()).toHaveProperty('value', ''); // cleared
    expect(document.querySelector('.error')).toBeNull();

    const raw = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY)!) as Array<{
      left: { path: string } | null;
    }>;
    expect(raw[0].left?.path).toBe('C:\\clips\\a.mp4');
  });

  it('saves on Enter in the name field', async () => {
    render(PresetsBar);
    await fireEvent.input(nameInput(), { target: { value: 'enter-preset' } });
    await fireEvent.keyDown(nameInput(), { key: 'Enter' });
    expect(screen.getByTitle('Apply preset').textContent).toBe('enter-preset');
  });

  it('overwrites a preset with the same name', async () => {
    render(PresetsBar);
    await fireEvent.input(nameInput(), { target: { value: 'dup' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await fireEvent.input(nameInput(), { target: { value: 'dup' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const buttons = screen.getAllByTitle('Apply preset');
    expect(buttons.length).toBe(1);
  });

  it('applying a preset restores files, options and refreshes entries', async () => {
    appState.optionValues['fullscreen'] = { linked: true, value: true };
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    render(PresetsBar);
    await fireEvent.input(nameInput(), { target: { value: 'work' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // mutate state, then apply the preset back
    appState.optionValues = {};
    appState.leftFile = { path: 'D:\\other\\x.mp4' };
    appState.leftDir = 'D:\\other';
    listMediaFiles.mockResolvedValue([makeEntry('a.mp4')]);

    await fireEvent.click(screen.getByTitle('Apply preset'));

    expect(appState.optionValues).toMatchObject({ fullscreen: { linked: true, value: true } });
    expect(appState.leftFile).toEqual({ path: 'C:\\clips\\a.mp4' });
    expect(appState.leftDir).toBe('C:\\clips');
    expect(listMediaFiles).toHaveBeenCalledWith('C:\\clips', false);
    await vi.waitFor(() => {
      expect(appState.leftEntries.length).toBe(1);
    });
  });

  it('applying a preset with right files refreshes the right side', async () => {
    appState.rightFiles = [{ path: 'E:\\r\\right.mp4' }];
    render(PresetsBar);
    await fireEvent.input(nameInput(), { target: { value: 'rt' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    appState.rightFiles = [];
    appState.rightDir = '';
    listMediaFiles.mockResolvedValue([makeEntry('right.mp4')]);

    await fireEvent.click(screen.getByTitle('Apply preset'));
    expect(appState.rightDir).toBe('E:\\r');
    expect(listMediaFiles).toHaveBeenCalledWith('E:\\r', false);
    await vi.waitFor(() => expect(appState.rightEntries.length).toBe(1));
  });

  it('applying a fileless preset clears selections without listing', async () => {
    render(PresetsBar);
    // save while nothing is selected => preset has no files
    await fireEvent.input(nameInput(), { target: { value: 'bare' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // now select files, then re-apply the empty preset
    appState.leftFile = { path: 'C:\\elsewhere\\z.mp4' };
    appState.leftDir = 'C:\\elsewhere';
    appState.rightFiles = [{ path: 'C:\\elsewhere\\r.mp4' }];
    await fireEvent.click(screen.getByTitle('Apply preset'));

    expect(appState.leftFile).toBeNull();
    expect(appState.rightFiles).toEqual([]);
    expect(listMediaFiles).not.toHaveBeenCalled();
  });

  it('deleting a preset removes it and persists the change', async () => {
    render(PresetsBar);
    await fireEvent.input(nameInput(), { target: { value: 'gone' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByTitle('Apply preset')).toBeTruthy();

    await fireEvent.click(screen.getByTitle('Delete'));
    expect(screen.queryByTitle('Apply preset')).toBeNull();
    expect(localStorage.getItem(PRESETS_STORAGE_KEY)).toBe('[]');
  });

  it('renaming a preset updates it and persists', async () => {
    render(PresetsBar);
    await fireEvent.input(nameInput(), { target: { value: 'old' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await fireEvent.click(screen.getByTitle('Rename'));
    const renameInput = document.querySelector('.rename-row input')!;
    await fireEvent.input(renameInput, { target: { value: 'new' } });
    await fireEvent.click(screen.getByTitle('Confirm rename'));

    expect(screen.getByTitle('Apply preset').textContent).toBe('new');
    expect(localStorage.getItem(PRESETS_STORAGE_KEY)).toContain('"name":"new"');
  });

  it('cancelling a rename keeps the old name', async () => {
    render(PresetsBar);
    await fireEvent.input(nameInput(), { target: { value: 'keep' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await fireEvent.click(screen.getByTitle('Rename'));
    const renameInput = document.querySelector('.rename-row input')!;
    await fireEvent.input(renameInput, { target: { value: 'other' } });
    await fireEvent.click(screen.getByTitle('Cancel rename'));

    expect(screen.getByTitle('Apply preset').textContent).toBe('keep');
  });

  it('renaming to an existing name shows an error', async () => {
    render(PresetsBar);
    await fireEvent.input(nameInput(), { target: { value: 'one' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await fireEvent.input(nameInput(), { target: { value: 'two' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await fireEvent.click(screen.getAllByTitle('Rename')[0]);
    const renameInput = document.querySelector('.rename-row input')!;
    await fireEvent.input(renameInput, { target: { value: 'two' } });
    await fireEvent.click(screen.getByTitle('Confirm rename'));

    expect(document.querySelector('.error')!.textContent).toContain('already exists');
    expect(screen.getAllByTitle('Apply preset').length).toBe(2);
  });

  it('loads presets already persisted in storage', () => {
    localStorage.setItem(
      PRESETS_STORAGE_KEY,
      JSON.stringify([
        {
          name: 'stored',
          options: {},
          left: null,
          rights: [],
          updatedAt: 1,
        },
      ]),
    );
    render(PresetsBar);
    expect(screen.getByTitle('Apply preset').textContent).toBe('stored');
  });

  it('surfaces listing errors without crashing on apply', async () => {
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    render(PresetsBar);
    await fireEvent.input(nameInput(), { target: { value: 'err' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    listMediaFiles.mockRejectedValue(new Error('boom'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await fireEvent.click(screen.getByTitle('Apply preset'));
    await vi.waitFor(() => expect(listMediaFiles).toHaveBeenCalled());
    err.mockRestore();
    expect(appState.leftFile).toEqual({ path: 'C:\\clips\\a.mp4' });
  });
});
