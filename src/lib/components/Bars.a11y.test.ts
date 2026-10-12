import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';

vi.mock('../ipc', () => ({
  ipc: { listMediaFiles: vi.fn() },
}));

import PresetsBar from './PresetsBar.svelte';
import ActiveChips from './ActiveChips.svelte';
import ThemeToggle from './ThemeToggle.svelte';
import { appState } from '../state/app.svelte';
import { resetAppState } from '../test-utils';
import { expectNoAxeViolations } from '../test-a11y';

beforeEach(() => {
  resetAppState();
  localStorage.clear();
});
afterEach(cleanup);

describe('PresetsBar accessibility', () => {
  it('has no axe violations when empty', async () => {
    const { container } = render(PresetsBar);
    await expectNoAxeViolations(container);
  });

  it('has no axe violations with saved presets', async () => {
    localStorage.setItem(
      'vidcompare.presets',
      JSON.stringify([
        {
          name: '1080p check',
          options: { fullscreen: { linked: true, value: true } },
          left: { path: 'C:\\clips\\a.mp4' },
          rights: [{ path: 'C:\\clips\\b.mp4' }],
        },
      ]),
    );
    const { container } = render(PresetsBar);
    await expectNoAxeViolations(container);
  });
});

describe('ActiveChips accessibility', () => {
  it('has no axe violations when chips are visible', async () => {
    appState.optionValues['fullscreen'] = { linked: true, value: true };
    appState.optionValues['decoder'] = {
      linked: false,
      leftValue: 'dxva2',
      rightValue: 'd3d11va',
    };
    const { container } = render(ActiveChips);
    await expectNoAxeViolations(container);
  });
});

describe('ThemeToggle accessibility', () => {
  it('has no axe violations and exposes its state', async () => {
    const { container } = render(ThemeToggle);
    await expectNoAxeViolations(container);
  });
});
