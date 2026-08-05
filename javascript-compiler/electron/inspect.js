/**
 * Structured value serializer for the rich console.
 *
 * Converts arbitrary runtime values into a JSON tree the renderer draws as a
 * collapsible, colour-coded DevTools-style output pane.
 *
 * This file is used two ways:
 *   1. `require()`d normally (main process helpers)
 *   2. read as TEXT and prepended to sandbox code (worker_threads eval worker,
 *      and the `node -e` child used by Node/Pro mode). Plain `node` cannot read
 *      files inside an asar archive, so injection-as-text is the only portable
 *      option there.
 *
 * Because of (2) everything here must be self-contained: no imports beyond
 * `util`, and no reliance on module-scope state that a host might not have.
 */

const INSPECT_LIMITS = {
  depth: 4,
  items: 100,
  keys: 100,
  string: 10000,
};

/** process.binding('util') is deprecated and warns on stderr — silence it. */
function loadPromiseDetails() {
  try {
    if (typeof process === "undefined" || typeof process.binding !== "function") return null;
    const prev = process.noDeprecation;
    process.noDeprecation = true;
    let binding = null;
    try {
      binding = process.binding("util");
    } finally {
      process.noDeprecation = prev;
    }
    if (binding && typeof binding.getPromiseDetails === "function") {
      return binding.getPromiseDetails;
    }
  } catch {
    /* not available — fall back to util.inspect text */
  }
  return null;
}

const getPromiseDetails = loadPromiseDetails();
// v8 promise states: 0 = pending, 1 = fulfilled, 2 = rejected
const PROMISE_STATES = ["pending", "fulfilled", "rejected"];

// Host-installed hook that rewrites raw V8 stacks into user-facing ones.
let stackTransform = null;
function setStackTransform(fn) {
  stackTransform = typeof fn === "function" ? fn : null;
}

/**
 * Keeps only the frames that belong to the user's own code and rewrites their
 * synthetic `<anonymous>:LINE:COL` positions into real source lines.
 */
function cleanStack(raw, offset, extraOffset) {
  const text = String(raw || "");
  const [head, ...frames] = text.split("\n");
  const kept = [];
  for (const frame of frames) {
    const m = /<anonymous>:(\d+):(\d+)/.exec(frame);
    if (!m) continue;
    const line = parseInt(m[1], 10) - (offset || 0) - (extraOffset || 0);
    if (line <= 0) continue;
    kept.push(`    at line ${line}:${m[2]}`);
  }
  return kept.length ? [head, ...kept].join("\n") : head;
}

function safeUtilInspect(value, depth) {
  try {
    // eslint-disable-next-line global-require
    return require("util").inspect(value, { depth: depth ?? 2, colors: false });
  } catch {
    try {
      return String(value);
    } catch {
      return "[unprintable]";
    }
  }
}

function functionLabel(fn) {
  const name = typeof fn.name === "string" && fn.name ? fn.name : "anonymous";
  let src = "";
  try {
    src = Function.prototype.toString.call(fn);
  } catch {
    /* bound/native */
  }
  if (/^\s*class[\s{]/.test(src)) return { kind: "class", label: `class ${name}` };
  return { kind: "function", label: `ƒ ${name}()` };
}

function constructorName(value) {
  try {
    const proto = Object.getPrototypeOf(value);
    if (proto === null) return "Object(null prototype)";
    const ctor = proto.constructor;
    if (ctor && typeof ctor.name === "string" && ctor.name) return ctor.name;
  } catch {
    /* proxy trap threw */
  }
  return "Object";
}

function typedArrayKind(value) {
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
    if (typeof DataView !== "undefined" && value instanceof DataView) return "DataView";
    return constructorName(value);
  }
  if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) return "ArrayBuffer";
  return null;
}

function clampString(str) {
  const s = String(str);
  if (s.length <= INSPECT_LIMITS.string) return { text: s, truncated: false };
  return { text: s.slice(0, INSPECT_LIMITS.string), truncated: true, fullLength: s.length };
}

/** Read a property without letting a throwing getter kill the whole log. */
function readProp(obj, key) {
  try {
    return { ok: true, value: obj[key] };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

function serializeValue(value, depth, seen) {
  const t = typeof value;

  if (value === null) return { k: "null" };
  if (value === undefined) return { k: "undefined" };

  if (t === "string") {
    const c = clampString(value);
    return { k: "string", v: c.text, truncated: c.truncated, len: c.fullLength };
  }
  if (t === "number") {
    if (Object.is(value, -0)) return { k: "number", v: "-0" };
    if (Number.isNaN(value)) return { k: "number", v: "NaN" };
    if (value === Infinity) return { k: "number", v: "Infinity" };
    if (value === -Infinity) return { k: "number", v: "-Infinity" };
    return { k: "number", v: String(value) };
  }
  if (t === "bigint") return { k: "bigint", v: `${value.toString()}n` };
  if (t === "boolean") return { k: "boolean", v: value };
  if (t === "symbol") return { k: "symbol", v: value.toString() };

  if (t === "function") {
    const info = functionLabel(value);
    return { k: info.kind, v: info.label };
  }

  if (t !== "object") return { k: "unknown", v: safeUtilInspect(value, 0) };

  // ── objects from here down ──
  if (seen.has(value)) return { k: "circular" };

  if (value instanceof Error) {
    const rawStack = typeof value.stack === "string" ? value.stack : "";
    const stack = stackTransform ? stackTransform(rawStack) : rawStack;
    return {
      k: "error",
      v: `${value.name || "Error"}: ${value.message || ""}`.trim(),
      stack: clampString(stack).text,
    };
  }
  if (value instanceof Date) {
    const iso = Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
    return { k: "date", v: iso };
  }
  if (value instanceof RegExp) return { k: "regexp", v: String(value) };

  if (getPromiseDetails) {
    let details = null;
    try {
      details = getPromiseDetails(value);
    } catch {
      details = null;
    }
    // getPromiseDetails returns undefined for non-promises
    if (details && typeof details[0] === "number") {
      const state = PROMISE_STATES[details[0]] || "pending";
      seen.add(value);
      const node = {
        k: "promise",
        state,
        value:
          details[0] === 0
            ? null
            : depth >= INSPECT_LIMITS.depth
              ? { k: "truncated" }
              : serializeValue(details[1], depth + 1, seen),
      };
      seen.delete(value);
      return node;
    }
  }
  if (typeof Promise !== "undefined" && value instanceof Promise) {
    // getPromiseDetails is unavailable in some sandboxes; fall back to reading
    // the state (and settled value) out of util.inspect's own rendering.
    const raw = safeUtilInspect(value, 3);
    const inner = /^Promise\s*\{\s*([\s\S]*?)\s*\}$/.exec(raw);
    const body = inner ? inner[1] : "";
    if (/^<pending>/.test(body)) return { k: "promise", state: "pending", value: null };
    if (/^<rejected>/.test(body)) {
      return {
        k: "promise",
        state: "rejected",
        value: { k: "text", v: body.replace(/^<rejected>\s*/, "") },
      };
    }
    return {
      k: "promise",
      state: body ? "fulfilled" : "pending",
      value: body ? { k: "text", v: body } : null,
    };
  }

  const taKind = typedArrayKind(value);
  if (taKind === "ArrayBuffer") {
    return { k: "arraybuffer", ctor: "ArrayBuffer", size: value.byteLength };
  }
  if (taKind === "DataView") {
    return { k: "arraybuffer", ctor: "DataView", size: value.byteLength };
  }

  if (depth >= INSPECT_LIMITS.depth) return { k: "truncated" };

  seen.add(value);
  try {
    if (Array.isArray(value) || (taKind && taKind !== "ArrayBuffer" && taKind !== "DataView")) {
      const len = value.length;
      const cap = Math.min(len, INSPECT_LIMITS.items);
      const items = [];
      for (let i = 0; i < cap; i += 1) {
        const r = readProp(value, i);
        items.push(r.ok ? serializeValue(r.value, depth + 1, seen) : { k: "thrown", v: r.error });
      }
      return {
        k: "array",
        ctor: taKind || null,
        len,
        items,
        truncated: len > cap,
      };
    }

    if (typeof Map !== "undefined" && value instanceof Map) {
      const entries = [];
      let i = 0;
      for (const [mk, mv] of value) {
        if (i >= INSPECT_LIMITS.items) break;
        entries.push([serializeValue(mk, depth + 1, seen), serializeValue(mv, depth + 1, seen)]);
        i += 1;
      }
      return { k: "map", size: value.size, entries, truncated: value.size > entries.length };
    }

    if (typeof Set !== "undefined" && value instanceof Set) {
      const items = [];
      let i = 0;
      for (const sv of value) {
        if (i >= INSPECT_LIMITS.items) break;
        items.push(serializeValue(sv, depth + 1, seen));
        i += 1;
      }
      return { k: "set", size: value.size, items, truncated: value.size > items.length };
    }

    if (
      (typeof WeakMap !== "undefined" && value instanceof WeakMap) ||
      (typeof WeakSet !== "undefined" && value instanceof WeakSet)
    ) {
      return { k: "opaque", v: constructorName(value) };
    }

    // Plain / class object
    let keys = [];
    try {
      keys = Object.keys(value);
    } catch {
      keys = [];
    }
    const cap = Math.min(keys.length, INSPECT_LIMITS.keys);
    const entries = [];
    for (let i = 0; i < cap; i += 1) {
      const key = keys[i];
      const r = readProp(value, key);
      entries.push([key, r.ok ? serializeValue(r.value, depth + 1, seen) : { k: "thrown", v: r.error }]);
    }
    try {
      for (const sym of Object.getOwnPropertySymbols(value)) {
        if (entries.length >= INSPECT_LIMITS.keys) break;
        const desc = Object.getOwnPropertyDescriptor(value, sym);
        if (!desc || !desc.enumerable) continue;
        const r = readProp(value, sym);
        entries.push([
          sym.toString(),
          r.ok ? serializeValue(r.value, depth + 1, seen) : { k: "thrown", v: r.error },
        ]);
      }
    } catch {
      /* proxy trap threw */
    }

    const ctor = constructorName(value);
    return {
      k: "object",
      ctor: ctor === "Object" ? null : ctor,
      entries,
      truncated: keys.length > cap,
    };
  } catch (e) {
    return { k: "thrown", v: e && e.message ? e.message : String(e) };
  } finally {
    seen.delete(value);
  }
}

/** Serialize one console argument into a render tree. */
function serializeArg(value) {
  try {
    return serializeValue(value, 0, new WeakSet());
  } catch (e) {
    return { k: "thrown", v: e && e.message ? e.message : String(e) };
  }
}

/** Serialize a console.* argument list. */
function serializeArgs(args) {
  return Array.prototype.map.call(args, serializeArg);
}

/**
 * V8 reports line numbers of dynamically compiled code relative to an internal
 * wrapper, so the offset is discovered at runtime rather than hardcoded.
 * Returns the number to subtract from a reported line to get the user's line.
 */
function measureLineOffset(CompileFn) {
  try {
    // The stack is handed back through `arguments` rather than `return` so the
    // same probe works for AsyncFunction, whose return value is a Promise.
    // An async body still runs synchronously up to its first await.
    const probe = new CompileFn("arguments[0].stack = new Error().stack;");
    const holder = {};
    probe(holder);
    const reported = firstDynamicFrameLine(holder.stack || "");
    if (reported === null) return null;
    return reported - 1;
  } catch {
    return null;
  }
}

/**
 * Line number of the innermost frame that belongs to dynamically compiled code.
 * Such frames are anonymous — `at <anonymous>:3:15`, `at foo (<anonymous>:3:15)`
 * or `at eval (eval at …, <anonymous>:3:15)`.
 */
function firstDynamicFrameLine(stack) {
  const lines = String(stack || "").split("\n");
  for (const line of lines) {
    if (!/^\s*at\s/.test(line)) continue;
    const m = /<anonymous>:(\d+):(\d+)/.exec(line);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/** User source line for a captured stack, or null when it can't be mapped. */
function userLineFromStack(stack, offset, extraOffset) {
  if (offset === null || offset === undefined) return null;
  const reported = firstDynamicFrameLine(stack);
  if (reported === null) return null;
  const line = reported - offset - (extraOffset || 0);
  return line > 0 ? line : null;
}

module.exports = {
  INSPECT_LIMITS,
  serializeArg,
  serializeArgs,
  serializeValue,
  measureLineOffset,
  firstDynamicFrameLine,
  userLineFromStack,
  setStackTransform,
  cleanStack,
};
