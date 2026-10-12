# Option Profiles

## Format

An option profile is a JSON document that describes every video-compare CLI option, its type, help text, group, and side-applicability. The entire options UI is rendered from this file.

```jsonc
{
  "profileVersion": 1,
  "minAppVersion": "0.1.0",
  "upstream": { "version": "2025-01-01" },
  "inputs": { "multiRight": true, "sameFilePlaceholder": "__" },
  "groups": [{ "id": "quick", "label": "Quick", "order": 0 }],
  "options": [
    {
      "id": "display-mode",
      "flag": "--mode",
      "label": "Display mode",
      "help": "Layout: split, vstack, or hstack.",
      "group": "quick",
      "appliesTo": "global",
      "type": { "kind": "enum", "values": [...] }
    }
  ]
}
```

## Option types

| `type.kind` | Renders as |
|---|---|
| `bool` | Checkbox |
| `string` | Text input |
| `text` | Multiline textarea |
| `number` | Number input |
| `enum` | Select dropdown |
| `enum-multi` | Multi-select |
| `path` | File/dir picker |
| `size` | WxH input |
| `time-offset` | Time offset input |
| `color` | Color picker |
| `key-value-list` | Key=value list editor |
| `filter-chain` | Filter chain input |
| `string-list` | Ordered string list |
| `raw` | Raw text (fallback for unknown kinds) |

## Side applicability

| `appliesTo` | Renders as |
|---|---|
| `global` | Full-width "Shared" section |
| `left` | Left column only |
| `right` | Right column only |
| `both` | Full-width "Shared" section |
| `pair` | One field per column, with 🔗 link toggle |

## Pair styles

- `separateFlags`: linked → `--decoder <v>`; unlinked → `--left-decoder <l> --right-decoder <r>`
- `colon`: linked → `-C bt709`; unlinked → `-C bt2020nc:bt709`

## Versioning

- `profileVersion`: schema version of the profile format (currently 1)
- `minAppVersion`: earliest VidCompare version that can load this profile
- `maxAppVersion`: optional upper bound

The app refuses profiles with `profileVersion > known` or `minAppVersion > app version`.

## Distribution

Profiles are published as release artifacts alongside the app. Users can download a profile for any upstream video-compare version and load it without rebuilding the app.
