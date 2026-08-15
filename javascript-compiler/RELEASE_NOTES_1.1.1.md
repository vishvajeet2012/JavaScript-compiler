# JS Compiler v1.1.1

npm install in the Node package bar works again on Windows.

## Fixed

- **npm install failed with `spawn EINVAL` on Windows.** Node blocks launching `npm.cmd` directly since the CVE-2024-27980 security fix, so every install attempt died before npm even started. The app now runs npm's own `npm-cli.js` through `node`, with a shell fallback only when that script cannot be located.
- **"Invalid package name" when typing a full command.** The npm bar now accepts what people actually type or paste — `npm i lodash`, `npm install axios@1`, `yarn add dayjs` — and not just the bare package name.
- **npm uninstall failed the same way** on Windows; it uses the same shell-free launcher now.
- **Node mode could not find Node.js** when the app was launched with a trimmed `PATH` (Start Menu / desktop shortcut). Common install locations are now checked as well.
- Clearer error when Node.js really is missing, instead of a raw `EINVAL` / `ENOENT` message.

## Changed

- Install several packages in one go: `lodash axios dayjs` (up to 10 per install).
- npm bar placeholder shows the accepted formats.
