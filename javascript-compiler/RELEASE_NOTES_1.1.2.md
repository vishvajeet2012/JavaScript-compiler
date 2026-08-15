# JS Compiler v1.1.2

New tabs stay in the language you are working in.

## Fixed

- **The language dropdown reset to JavaScript on every new file.** New tabs were always created as JavaScript, so selecting Node and pressing `+` (or Ctrl+N, or New file in a folder) threw you back to JavaScript. A new tab now inherits the language of the tab you were in.
- **The npm bar disappeared with it** — because the new tab was JavaScript, the Node package bar hid itself and installs had to wait for a manual switch back to Node.

Opening a saved file, a template, or a restored session still uses that file's own language, as before.
