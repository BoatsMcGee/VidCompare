import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoAxeViolations } from '../test-a11y';

import CompareSplitButton from './CompareSplitButton.svelte';

beforeEach(() => {
  // jsdom has no PointerEvent constructor; fall back to MouseEvent.
  if (typeof window.PointerEvent === 'undefined') {
    (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;
  }
});

afterEach(cleanup);

describe('CompareSplitButton', () => {
  it('calls onCompare from the primary button', async () => {
    const onCompare = vi.fn();
    render(CompareSplitButton, { props: { onCompare, onLaunch: vi.fn() } });
    await fireEvent.click(screen.getByTestId('compare-button'));
    expect(onCompare).toHaveBeenCalledTimes(1);
  });

  it('opens the dropdown and calls onLaunch from the menu item', async () => {
    const onLaunch = vi.fn();
    render(CompareSplitButton, { props: { onCompare: vi.fn(), onLaunch } });
    const toggle = screen.getByTestId('compare-menu-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(screen.getByTestId('launch-external'));
    expect(onLaunch).toHaveBeenCalledTimes(1);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the menu on Escape without launching', async () => {
    const onLaunch = vi.fn();
    render(CompareSplitButton, { props: { onCompare: vi.fn(), onLaunch } });
    await fireEvent.click(screen.getByTestId('compare-menu-toggle'));
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('launch-external')).toBeNull();
    expect(onLaunch).not.toHaveBeenCalled();
  });

  it('disables both buttons when disabled', () => {
    render(CompareSplitButton, { props: { disabled: true, onCompare: vi.fn(), onLaunch: vi.fn() } });
    expect((screen.getByTestId('compare-button') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('compare-menu-toggle') as HTMLButtonElement).disabled).toBe(true);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(CompareSplitButton, {
      props: { onCompare: vi.fn(), onLaunch: vi.fn() },
    });
    await fireEvent.click(screen.getByTestId('compare-menu-toggle'));
    await expectNoAxeViolations(container);
  });
});
