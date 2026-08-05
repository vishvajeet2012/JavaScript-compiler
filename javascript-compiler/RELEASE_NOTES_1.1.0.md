# JS Compiler v1.1.0

_Released 05-08-2026_

## Added
- **Multi-tab editing** — open many files at once, each tab keeps its own undo history and cursor position
- Tab bar with unsaved-changes dot, close button, and `+` for a new tab
- **Session restore** — every open tab, including files you never saved, is stored locally and comes back after a restart or accidental close
- **Integrated terminal** (Pro) — run `npm`, `node`, and `git` inside the app, in the same sandbox Node mode uses
- Console / Terminal panel tabs with `Ctrl` + `` ` `` to switch
- **Rich console output** — objects, arrays, `Map`, `Set`, `Promise`, `Date`, class instances, typed arrays and circular references render as colour-coded, expandable trees instead of flat text
- **Source line numbers** in the output gutter, so each log points at the line that produced it
- Error output shows a clean, expandable stack trace with real source lines
- Run timing — each run reports how long it took
- New shortcuts: `Ctrl+N` new tab, `Ctrl+W` close tab, `Ctrl` + `` ` `` toggle terminal

## Fixed
- `console.log` of objects and arrays printed `[object Object]` / unusable text instead of readable structure
- Output from a script that hits an infinite loop is no longer discarded — logs now stream as they happen, so everything printed before the timeout is kept
- Node mode: user output written directly to `stdout` no longer corrupts the run result
- Node mode: `util.inspect` in the sandbox returned flat JSON instead of a proper inspection
- Console output no longer overflows horizontally — long lines wrap and stay selectable
- Editor keyboard shortcuts no longer collide with the native Electron menu accelerators

## Changed
- Console panel redesigned: per-entry rows, severity colours, error/warning highlighting, auto-scroll
- Clear button clears whichever panel is in front (console or terminal)
- "New file" opens a tab instead of replacing what you were working on

## Removed
- Nothing
