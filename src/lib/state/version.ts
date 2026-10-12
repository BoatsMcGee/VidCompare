/**
 * Pure helpers for matching a detected video-compare binary version against
 * the upstream version an option profile targets (profile auto-match).
 */

const VERSION_TOKEN = /\b\d{4}-\d{2}(?:-\d{2})?\b|\b\d{8}\b|\b\d+\.\d+(?:\.\d+)?\b/;

/** Extract a comparable version token from free-form text, e.g.
 *  "video-compare version 2025-06-01" -> "2025-06-01". */
export function extractVersionToken(text: string): string | null {
  const m = VERSION_TOKEN.exec(text);
  return m ? m[0] : null;
}

/**
 * True when the binary's version matches the profile's `upstream.version`.
 * Month-precision values ("2025-06") match full dates in the same month
 * ("2025-06-01"); compact dates ("20261004") match dashed forms of the same
 * day ("2026-10-04"). Unparseable binary output counts as a mismatch only
 * when it does not contain the upstream version.
 */
export function profileMatchesBinary(binaryVersion: string, upstreamVersion: string): boolean {
  const upstream = upstreamVersion.trim();
  const b = extractVersionToken(binaryVersion);
  const u = extractVersionToken(upstream);

  if (b && u) {
    if (b === u || b.startsWith(`${u}-`) || u.startsWith(`${b}-`)) return true;
    // Compact vs dashed date: 20261004 ≡ 2026-10-04.
    return normalizeDate(b) === normalizeDate(u);
  }
  if (b && !u) return binaryVersion.includes(upstream);
  if (!b && u) return binaryVersion.includes(u);
  return binaryVersion.trim() === upstream;
}

function normalizeDate(token: string): string | null {
  if (/^\d{8}$/.test(token)) {
    return `${token.slice(0, 4)}-${token.slice(4, 6)}-${token.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return token;
  return null;
}
