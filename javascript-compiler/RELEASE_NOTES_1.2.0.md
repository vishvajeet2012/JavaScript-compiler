# JS Compiler v1.2.0

Templates for every language, and a terminal that no longer needs the internet.

## Added

- **25 new templates — 38 in total, every language covered:**
  - **JavaScript (13):** loops & FizzBuzz, destructuring & spread, objects & JSON, Map & Set, error handling with a custom `Error`, closures, sort & search.
  - **TypeScript (8):** types & unions, typed functions with rest and default params, classes, type guards, arrays & tuples, typed async/await.
  - **HTML + CSS (8):** flexbox card, CSS grid gallery, CSS-variable theming, keyframe animation, form validation, todo list. Each ships real markup and CSS, and the script runs in the console *and* in a browser if you export the file.
  - **Node (9):** `fs` read/write, JSON store, `crypto` hashes, `EventEmitter`, `fetch` against a live API, folder listing.

## Fixed

- **Terminal failed to load without internet.** xterm was pulled from a CDN on every launch, so a slow network, a firewall, or being offline left the Terminal tab with "Terminal library failed to load". The library now ships inside the app.
- **TypeScript rest parameters** (`function total(...prices: number[])`) were left half-stripped and crashed Run with a syntax error.
- **TypeScript optional parameters** (`name?: string`) had the same problem.
- **Object literals were mangled by the type stripper** — `{ a: 1, b: 2, c: 3 }` could lose a value because the annotation pattern matched plain data. Type annotations are now anchored to real type names.
- **Async examples printed nothing.** Calling `main()` without awaiting it let the runner finish before the output arrived; the async templates now use top-level await, which this runtime supports.

## Changed

- xterm 5.3.0 and the fit addon are vendored in `src/vendor/` (MIT license included) instead of being fetched from jsDelivr.
