import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/svelte';

vi.mock('../ipc', () => ({
  ipc: { runInfoCommand: vi.fn() },
}));

import OptionsForm from './OptionsForm.svelte';
import { ipc } from '../ipc';
import { appState } from '../state/app.svelte';
import { resetAppState } from '../test-utils';

const runInfoCommand = vi.mocked(ipc.runInfoCommand);

beforeEach(() => {
  resetAppState();
  runInfoCommand.mockReset();
});

afterEach(cleanup);

const searchBox = () => screen.getByPlaceholderText('🔍 Search options…');
const leftColumn = (c: HTMLElement) => c.querySelectorAll('.column')[0] as HTMLElement;
const rightColumn = (c: HTMLElement) => c.querySelectorAll('.column')[1] as HTMLElement;
const findRow = (col: HTMLElement, label: string) =>
  Array.from(col.querySelectorAll('.option-row')).find(
    (r) => r.querySelector('label')?.textContent === label,
  ) as HTMLElement;

describe('OptionsForm', () => {
  it('renders group tabs from the profile', () => {
    render(OptionsForm);
    expect(screen.getByRole('button', { name: 'Quick' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Inputs & Decoding' })).toBeTruthy();
  });

  it('clicking a tab switches the active group', async () => {
    render(OptionsForm);
    expect(appState.activeGroup).toBe('quick');
    await fireEvent.click(screen.getByRole('button', { name: 'Inputs & Decoding' }));
    expect(appState.activeGroup).toBe('io');
    expect(screen.getAllByText('Decoder').length).toBeGreaterThan(0);
    expect(screen.getByText('Left filters')).toBeTruthy();
    expect(screen.getByText('Right filters')).toBeTruthy();
  });

  it('renders bool, enum, number and string controls in the shared section', () => {
    const { container } = render(OptionsForm);
    const shared = container.querySelector('.shared') as HTMLElement;
    expect(within(shared).getByRole('checkbox')).toBeTruthy();
    expect(within(shared).getByRole('combobox')).toBeTruthy();
    expect(within(shared).getByRole('spinbutton')).toBeTruthy();
    const texts = within(shared)
      .getAllByRole('textbox')
      .filter((i) => (i as HTMLInputElement).type === 'text');
    expect(texts.length).toBeGreaterThanOrEqual(1); // time shift
  });

  it('bool option toggles values in appState', async () => {
    const { container } = render(OptionsForm);
    const checkbox = within(container.querySelector('.shared') as HTMLElement).getByRole(
      'checkbox',
    );
    await fireEvent.click(checkbox);
    expect(appState.optionValues['fullscreen']).toEqual({ value: true });
    await fireEvent.click(checkbox);
    expect(appState.optionValues['fullscreen']).toEqual({ value: false });
  });

  it('number option stores the typed value', async () => {
    const { container } = render(OptionsForm);
    const input = within(container.querySelector('.shared') as HTMLElement).getByRole(
      'spinbutton',
    );
    await fireEvent.input(input, { target: { value: '150' } });
    expect(appState.optionValues['ui-scale']).toEqual({ value: 150 });
  });

  it('enum select stores the chosen value', async () => {
    const { container } = render(OptionsForm);
    const select = within(container.querySelector('.shared') as HTMLElement).getByRole(
      'combobox',
    );
    await fireEvent.change(select, { target: { value: 'vstack' } });
    expect(appState.optionValues['display-mode']).toEqual({ value: 'vstack' });
    await fireEvent.change(select, { target: { value: '' } });
    expect(appState.optionValues['display-mode']).toEqual({ value: '' });
  });

  it('string option stores the typed value', async () => {
    const { container } = render(OptionsForm);
    const shared = container.querySelector('.shared') as HTMLElement;
    const input = within(shared)
      .getAllByRole('textbox')
      .find((i) => (i as HTMLInputElement).type === 'text')!;
    await fireEvent.input(input, { target: { value: '0.5' } });
    expect(appState.optionValues['time-shift']).toEqual({ value: '0.5' });
  });

  it('search query replaces columns with flat results', async () => {
    const { container } = render(OptionsForm);
    await fireEvent.input(searchBox(), { target: { value: 'decoder' } });
    expect(appState.searchQuery).toBe('decoder');
    const results = container.querySelectorAll('.search-result');
    expect(results.length).toBeGreaterThan(0);
    expect(container.querySelector('.columns')).toBeNull();
    expect(results[0].textContent).toContain('Decoder');
  });

  it('empty search results fall back to the group panel', async () => {
    const { container } = render(OptionsForm);
    await fireEvent.input(searchBox(), { target: { value: 'zzz-no-match' } });
    expect(container.querySelector('.columns')).toBeTruthy();
    expect(container.querySelector('.search-results')).toBeNull();
  });

  it('clearing the search restores the group panel', async () => {
    const { container } = render(OptionsForm);
    await fireEvent.input(searchBox(), { target: { value: 'decoder' } });
    expect(container.querySelector('.search-results')).toBeTruthy();
    await fireEvent.input(searchBox(), { target: { value: '' } });
    expect(container.querySelector('.columns')).toBeTruthy();
    expect(container.querySelector('.search-results')).toBeNull();
  });

  it('pair options render linked with a shared value input', async () => {
    appState.activeGroup = 'io';
    const { container } = render(OptionsForm);
    const row = findRow(leftColumn(container), 'Decoder');
    expect(within(row).getByTitle('Unlink L/R')).toBeTruthy();
    expect(within(row).queryByTitle('Link L/R')).toBeNull();

    const input = within(row).getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'auto' } });
    expect(appState.optionValues['decoder']).toEqual({ value: 'auto' });
  });

  it('unlinking a pair splits it into left and right inputs', async () => {
    appState.activeGroup = 'io';
    const { container } = render(OptionsForm);
    const row = findRow(leftColumn(container), 'Decoder');

    await fireEvent.click(within(row).getByTitle('Unlink L/R'));
    expect(appState.optionValues['decoder']!.linked).toBe(false);

    const newRow = findRow(leftColumn(container), 'Decoder');
    expect(within(newRow).getByTitle('Link L/R')).toBeTruthy();
    expect(within(newRow).getByRole('textbox')).toBeTruthy();

    const input = within(newRow).getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'dxva2' } });
    expect(appState.optionValues['decoder']!.leftValue).toBe('dxva2');
  });

  it('unlinked pair right column writes rightValue', async () => {
    appState.activeGroup = 'io';
    appState.optionValues['decoder'] = { linked: false, leftValue: 'a', rightValue: '' };
    const { container } = render(OptionsForm);
    const row = findRow(rightColumn(container), 'Decoder');
    const input = within(row).getByRole('textbox');
    await fireEvent.input(input, { target: { value: 'd3d11va' } });
    expect(appState.optionValues['decoder']!.rightValue).toBe('d3d11va');
  });

  it('re-linking a pair flips linked and keeps stored side values', async () => {
    appState.activeGroup = 'io';
    appState.optionValues['decoder'] = {
      linked: false,
      leftValue: 'dxva2',
      rightValue: 'd3d11va',
    };
    const { container } = render(OptionsForm);
    const row = findRow(leftColumn(container), 'Decoder');
    await fireEvent.click(within(row).getByTitle('Link L/R'));
    // re-link keeps the stored side values and flips linked on
    expect(appState.optionValues['decoder']).toEqual({
      linked: true,
      leftValue: 'dxva2',
      rightValue: 'd3d11va',
    });
  });

  it('left-only options render only in the left column', () => {
    appState.activeGroup = 'io';
    const { container } = render(OptionsForm);
    expect(within(leftColumn(container)).getByText('Left filters')).toBeTruthy();
    expect(within(rightColumn(container)).queryByText('Left filters')).toBeNull();
    expect(within(rightColumn(container)).getByText('Right filters')).toBeTruthy();
    expect(within(leftColumn(container)).queryByText('Right filters')).toBeNull();
  });

  it('opens the find helper dialog, searches, then closes', async () => {
    appState.activeGroup = 'io';
    runInfoCommand.mockResolvedValue('found-filter-hint');
    render(OptionsForm);

    await fireEvent.click(screen.getByRole('button', { name: 'Find filters' }));
    expect(screen.getByRole('heading', { name: 'Find filters' })).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('found-filter-hint')).toBeTruthy();
    expect(runInfoCommand).toHaveBeenCalledWith('filters', '');

    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('heading', { name: 'Find filters' })).toBeNull();
  });

  it('find helper surfaces errors as text', async () => {
    render(OptionsForm);
    runInfoCommand.mockRejectedValue(new Error('not found'));
    await fireEvent.click(screen.getByRole('button', { name: 'Find decoders' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Error: not found')).toBeTruthy();
  });

  it('clicking the dialog overlay closes it', async () => {
    render(OptionsForm);
    await fireEvent.click(screen.getByRole('button', { name: 'Find filters' }));
    const overlay = document.querySelector('.dialog-overlay')!;
    await fireEvent.click(overlay);
    expect(screen.queryByRole('heading', { name: 'Find filters' })).toBeNull();
  });
});
