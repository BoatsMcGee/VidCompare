import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/svelte';

import ActiveChips from './ActiveChips.svelte';
import { appState } from '../state/app.svelte';
import { resetAppState } from '../test-utils';

beforeEach(() => resetAppState());
afterEach(cleanup);

describe('ActiveChips', () => {
  it('renders nothing when no options are active', () => {
    const { container } = render(ActiveChips);
    expect(container.querySelector('.chips')).toBeNull();
  });

  it('ignores empty, false and null values', () => {
    appState.optionValues = {
      a: { linked: true, value: '' },
      b: { linked: true, value: false },
      c: { linked: true, value: null as never },
      d: { linked: true, leftValue: '', rightValue: '' },
    };
    const { container } = render(ActiveChips);
    expect(container.querySelector('.chips')).toBeNull();
  });

  it('shows active options with spec labels and values', () => {
    appState.optionValues['fullscreen'] = { linked: true, value: true };
    appState.optionValues['display-mode'] = { linked: true, value: 'dual' };
    render(ActiveChips);
    expect(screen.getByText('Fullscreen=true')).toBeTruthy();
    expect(screen.getByText('Display mode=dual')).toBeTruthy();
  });

  it('falls back to the option id when no spec matches', () => {
    appState.optionValues['mystery'] = { linked: true, value: 'x' };
    render(ActiveChips);
    // no spec => no label metadata, value formatting yields empty string
    expect(screen.getByText('mystery=')).toBeTruthy();
  });

  it('formats unlinked pairs as L=… R=…', () => {
    appState.optionValues['decoder'] = {
      linked: false,
      leftValue: 'dxva2',
      rightValue: 'd3d11va',
    };
    render(ActiveChips);
    expect(screen.getByText('Decoder=L=dxva2 R=d3d11va')).toBeTruthy();
  });

  it('formats missing unlinked sides as em dash', () => {
    appState.optionValues['decoder'] = { linked: false, leftValue: 'dxva2' };
    render(ActiveChips);
    expect(screen.getByText('Decoder=L=dxva2 R=—')).toBeTruthy();
  });

  it('counts a left-only value as active', () => {
    appState.optionValues['left-filters'] = { linked: true, leftValue: 'scale=1280' };
    render(ActiveChips);
    expect(screen.getByText('Left filters=')).toBeTruthy();
  });

  it('✕ resets the option', async () => {
    appState.optionValues['fullscreen'] = { linked: true, value: true };
    const { container } = render(ActiveChips);
    const chip = container.querySelector('.chip')!;
    await fireEvent.click(within(chip as HTMLElement).getByRole('button'));
    expect(appState.optionValues['fullscreen']).toBeUndefined();
    expect(container.querySelector('.chips')).toBeNull();
  });
});
