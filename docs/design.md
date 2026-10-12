# Design

UI/UX design principles for VidCompare's frontend. The website demo
(`website/src/routes/demo`) reuses these patterns, so changes here ripple into
both the app and the marketing site.

## Side-column alignment (core pattern)

Many video-compare options exist in three forms: both-sides (`--decoder`),
left-only (`--left-decoder`), right-only (`--right-decoder`). The options area
is a **two-column grid that lines up with the video inputs**:

- The **left column** sits directly under the Left (L) file panel, the
  **right column** under the Right (R) panel. Panels are titled **Left** and
  **Right** everywhere (file panels, options columns, swap, command, logs) —
  "Reference"/"Distorted" is not used in the UI.
- Each column header carries the same color-coded `L`/`R` badge as its file
  panel (left = blue `--left-accent`, right = orange `--right-accent`). The
  badge always appears with a text label — color alone never carries meaning
  (WCAG AA / a11y).
- **Pair options** render as one field per column; the left field emits
  `--left-*`, the right field emits `--right-*`.
- **Link toggle (🔗)** on each pair row: linked (default) = one shared value,
  emitted as the combined flag (`--decoder <v>`); unlinked = independent values
  (`--left-decoder <l> --right-decoder <r>`). Colon-style pairs
  (`pairStyle: "colon"`) serialize as `-C left:right` when unlinked, keeping an
  empty side as `-C :pc`.
- **Left-/right-only options** appear only in their column — never a
  placeholder row on the other side.
- **Global options** live in a full-width **Shared** section beneath the two
  columns.

Rationale: users should never have to *read* a flag to know which video it
affects. Spatial position = side, and the shared/link state is visible on the
row itself.

## Grouping & decluttering

- **Group tabs** (Quick / Display / Playback / Color / Filters / Inputs &
  Decoding / Scopes / Advanced) filter the columns; order and membership come
  from the option profile, not hard-coded UI.
- **Quick** holds the 6–8 most-used options so casual users never open another
  tab.
- **Search** above the options area matches label/flag/help across all groups
  and lists results in place of the columns.
- **Active chips** above the command preview show every non-default option as
  a removable chip (`Decoder(L)=h264_cuvid ✕`) — one glance shows what the
  command will do; ✕ resets that option.
- **Per-video behavior** (multi-right slots, `__` same-as-left, `::key=value`
  overrides) belongs to the file list, not the options columns. The columns
  stay about global behavior.

## Layout skeleton (full window)

```
header:  VidCompare [binary badge] [theme ◐] [Compare ▾] [settings ⚙]
body:    file panels:  L Left  ⇄  R Right   (equal widths, 50/50 grid)
         options section (contiguous block):
                   presets bar (presets act on the options below it)
                   group tabs + search
                   L column | R column
                   Shared (full width)
         active chips
         command preview (readonly textarea, wraps; no horizontal scroll)
         video-compare output log (inline, only after a launch produces output)
footer:  status bar

compare page (replaces body when Compare is pressed):
         slim bar: [← Back] Compare            [embedded]
         embed surface (fills the window; overlay-embedded video-compare)
```

Rules:

- The app fits in one viewport; only the main area and the log panel scroll.
- **Swap (⇄)** swaps everything side-scoped: directories, file entries,
  show-all flags, and side-scoped option values — state and command always
  stay consistent.
- File lists are capped (`max-height: 200px`) so the options area is never
  pushed off-screen. Filenames truncate with ellipsis and expose the full
  name via a `title` tooltip; lists never scroll horizontally.
- Scrollbars are themed (`::-webkit-scrollbar` in `theme.css`) in both
  themes — never leave native scrollbars visible against the design.
- The video-compare log lives directly below the command preview (header:
  "video-compare output") — distinct from VidCompare's own app logs, which
  are reached from the settings dialog. It renders **only when a launch has
  produced output** (`hasVideoCompareOutput`); before that the layout stays
  compact.
- Compactness: 12–14 px body text, 11–13 px for secondary labels, 4–8 px
  padding, one border weight (`1px solid var(--border)`), one radius scale.
- No shadows except the subtle `--shadow` token; depth comes from the
  `--bg` → `--bg-secondary` → `--bg-tertiary` ladder.

## File panel header pattern

Each file panel is a single compact header row followed by the file list:

- **One row**: `L`/`R` badge → panel title (**Left**/**Right**) → inline
  folder-path textbox → 📂 browse button → "Show all files" checkbox.
- The **path textbox** commits on Enter or blur; an invalid folder turns the
  border red with a "Folder not found." tooltip and the input reverts to the
  current directory.
- **Drag & drop**: a file *or* folder can be dropped on the panel (drop is
  hit-tested against the panel rect using physical coordinates). Dropping a
  folder navigates to it; dropping a file selects it and lists its parent
  folder — `describe_path` decides which.
- Clicking the **file-list background** opens the browse dialog (pointer
  shortcut; the keyboard-accessible path is the browse button). The empty
  state is itself a browse button reading "Click to browse, or drop a file
  or folder here."

## Theming tokens

All color decisions are CSS custom properties defined once in
`src/styles/theme.css` (the website mirrors them in
`website/src/styles/theme.css`). **Never hard-code colors in components.**

| Token | Purpose |
|---|---|
| `--bg`, `--bg-secondary`, `--bg-tertiary` | Surface ladder (page, panels, hover) |
| `--fg`, `--fg-secondary`, `--fg-muted` | Text hierarchy |
| `--border` | All borders and dividers |
| `--accent`, `--accent-hover`, `--accent-fg` | Primary actions, focus rings, selection |
| `--left-accent`, `--right-accent` | L/R identity (blue/orange) |
| `--danger`, `--warning`, `--success` | Status colors |
| `--log-bg`, `--log-fg`, `--log-stderr` | Log panel (dark in both themes) |
| `--radius`, `--radius-sm`, `--shadow` | Shape/elevation scale |
| `--font`, `--font-mono` | UI and command/log typography |

- Themes switch by setting `data-theme="light" | "dark"` on
  `document.documentElement`; values are overridden under `[data-theme='dark']`.
- Default follows `prefers-color-scheme`; the header toggle cycles
  system → light → dark and persists the choice.
- Both themes must meet WCAG AA contrast; the log panel stays dark so ANSI-ish
  output colors (`--log-stderr`) keep their meaning.
- `prefers-reduced-motion` disables transitions/animations globally.

## Component conventions

- Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`, snippets); app
  state lives in `src/lib/state/app.svelte.ts`, argv logic in
  `src/lib/options/args.ts`.
- Styles are component-scoped (`<style>` blocks) and reference only design
  tokens; global element styling (buttons, inputs, badges) lives in
  `theme.css`.
- The website demo page copies these structures 1:1 so screenshots, demo and
  app never visually diverge.

## Compare page (embedded video-compare window)

The **Compare** page is a dedicated full-window view — entered via the
header **Compare** split button — so comparing videos is free of setup UI.
It embeds the *real* video-compare window rather than recreating its UX:

- A single **embed surface** fills the window under a slim bar (Back button
  + status). Entering the page auto-starts the embed: on Windows,
  `embed_launch` spawns video-compare, captures its top-level window,
  strips the frame, and reparents it as an owned popup over the surface;
  the surface geometry is forwarded to `embed_set_rect` from a
  requestAnimationFrame loop **and** from capture-phase `scroll`/`resize`
  listeners, so the captured window tracks layout changes without lagging
  behind a scroll. The backend clips the captured window to the visible
  slice of the surface, so scrolling never lets it overflow past the app
  window.
- Because the child keeps its own process, renderer, and keyboard handling,
  **every video-compare feature and shortcut works unchanged** — the app
  never re-implements or vendors upstream behavior.
- When the child process exits, the page **returns to setup automatically**.
  **Back** (or Esc) releases the embed and returns early.
- **"Launch in separate window"** (the split-button dropdown item) is the
  explicit backup path: the child runs in its own window.
- When capture fails the surface shows the reason with a Back button —
  never a broken state; the external Launch path remains available.
- Comparison modes (wipe/difference/blend/SSIM) belong to video-compare
  itself and are **not** app features — they will never appear in the Option
  Profile system.
