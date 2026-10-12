import { AxeResults } from 'axe-core';

/**
 * Shared axe-core accessibility helpers for component tests.
 *
 * jsdom does not implement a real accessibility tree, layout, or CSS
 * cascade, so several axe rules cannot run meaningfully there. The rules
 * disabled below fall into two groups:
 *
 * 1. Rules that need real rendering (color-contrast needs computed
 *    styles/layout; region/landmark rules need a full document structure
 *    that a bare component mount never has).
 * 2. Rules that need a full page context (page-has-heading-one,
 *    landmark-one-main, etc.) — a component test renders a fragment, not
 *    a page, so those are validated by the e2e suite against the real app
 *    window instead.
 */
export const JSDOM_DISABLED_RULES = [
  // Needs computed CSS + layout, which jsdom does not provide.
  'color-contrast',
  // Needs a full document; component tests mount isolated fragments.
  'page-has-heading-one',
  'landmark-one-main',
  'region',
  'bypass',
  // jsdom does not implement :focus-visible / focus delegation fully.
  'focus-order-semantics',
] as const;

/** Run axe against a mounted component and return violations. */
export async function axeViolations(container: HTMLElement): Promise<AxeResults['violations']> {
  const axe = (await import('axe-core')).default;
  const results = await axe.run(container, {
    rules: Object.fromEntries(JSDOM_DISABLED_RULES.map((id) => [id, { enabled: false }])),
  });
  return results.violations;
}

/** Assert no axe violations; on failure print a readable report. */
export async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const violations = await axeViolations(container);
  if (violations.length > 0) {
    const report = violations
      .map((v) => {
        const nodes = v.nodes
          .map((n) => `    ${n.target.join(', ')}${n.html ? ` — ${n.html}` : ''}`)
          .join('\n');
        return `  ✗ [${v.id}] ${v.help}\n${nodes}\n    ${v.helpUrl}`;
      })
      .join('\n');
    throw new Error(
      `axe-core found ${violations.length} accessibility violation(s):\n${report}`,
    );
  }
}
