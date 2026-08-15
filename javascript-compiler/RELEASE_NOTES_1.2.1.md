# JS Compiler v1.2.1

Click into a file and type. That's it.

## Fixed

- **Typing did nothing until you picked a file in the sidebar or hit Save.** When a tab was activated before the editor had been measured — at startup, on a restored session, when panels resized — Monaco rendered no lines, so a click landed on empty background and keyboard focus stayed on the page instead of the editor. The editor looked completely normal while every keystroke was dropped. Any click inside the editor now claims focus, and a tab activation re-measures the editor.
- **Blank editor with no explanation.** The code editor is downloaded on first start; if that failed you got an empty area and no hint why. It now says so and tells you to reconnect and restart.

## Notes

Reproduced and verified against the running app over the Chrome DevTools Protocol: clicking cold spots (empty area below the code, mid-editor, on a line) after a fresh boot and after a reload, then checking that a keystroke actually reaches the document.
