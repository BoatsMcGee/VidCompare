import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';

vi.mock('../ipc', () => ({
  ipc: { runInfoCommand: vi.fn() },
}));

import OptionsForm from './OptionsForm.svelte';
import { appState } from '../state/app.svelte';
import { resetAppState } from '../test-utils';
import { expectNoAxeViolations } from '../test-a11y';

beforeEach(() => resetAppState());
afterEach(cleanup);

describe('OptionsForm accessibility', () => {
  it('has no axe violations for the default (Quick) group', async () => {
    const { container } = render(OptionsForm);
    await expectNoAxeViolations(container);
  });

  it('has no axe violations for the pair-options group (L/R columns)', async () => {
    appState.activeGroup = 'io';
    const { container } = render(OptionsForm);
    await expectNoAxeViolations(container);
  });

  it('has no axe violations while a search is active', async () => {
    appState.searchQuery = 'mode';
    const { container } = render(OptionsForm);
    await expectNoAxeViolations(container);
  });
});
