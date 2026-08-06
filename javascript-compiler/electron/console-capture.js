/**
 * Full console surface for the sandboxes.
 *
 * Injected as text alongside inspect.js (see the note at the top of that file),
 * so it may only use globals that both the worker and a plain `node -e` child
 * provide, plus the serializer helpers from inspect.js.
 */

const TABLE_MAX_ROWS = 100;
const TABLE_MAX_COLS = 20;

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function formatDuration(ms) {
  if (ms < 1) return `${ms.toFixed(3)}ms`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(3)}s`;
}

/** Shapes any console.table input into a column/row grid. */
function serializeTable(data, columnFilter) {
  if (data === null || typeof data !== "object") {
    return { k: "table", columns: ["Values"], rows: [{ index: "0", cells: { Values: serializeArg(data) } }] };
  }

  const isArray = Array.isArray(data);
  const keys = isArray
    ? data.slice(0, TABLE_MAX_ROWS).map((_, i) => String(i))
    : Object.keys(data).slice(0, TABLE_MAX_ROWS);

  const columns = [];
  const rows = [];
  let needsValuesColumn = false;

  for (const key of keys) {
    let value;
    try {
      value = data[isArray ? Number(key) : key];
    } catch (e) {
      value = e;
    }
    const cells = {};
    if (value !== null && typeof value === "object" && !(value instanceof Date)) {
      const subKeys = Array.isArray(value)
        ? value.slice(0, TABLE_MAX_COLS).map((_, i) => String(i))
        : Object.keys(value).slice(0, TABLE_MAX_COLS);
      for (const sub of subKeys) {
        if (!columns.includes(sub) && columns.length < TABLE_MAX_COLS) columns.push(sub);
        if (columns.includes(sub)) {
          try {
            cells[sub] = serializeArg(value[sub]);
          } catch (e) {
            cells[sub] = serializeArg(e);
          }
        }
      }
    } else {
      needsValuesColumn = true;
      cells.Values = serializeArg(value);
    }
    rows.push({ index: key, cells });
  }

  if (needsValuesColumn) columns.push("Values");
  const filtered = Array.isArray(columnFilter)
    ? columns.filter((c) => columnFilter.includes(c))
    : columns;

  return {
    k: "table",
    columns: filtered.length ? filtered : columns,
    rows,
    truncated: (isArray ? data.length : Object.keys(data).length) > keys.length,
  };
}

/**
 * Replaces the console with capturing versions.
 *
 * @param {{ emit: (entry: object) => void, getLine: () => number|null }} opts
 * @returns {() => void} restores the original console
 */
function installConsoleCapture(opts) {
  const emit = opts.emit;
  const getLine = opts.getLine || (() => null);

  const METHODS = [
    "log", "info", "warn", "error", "debug", "trace", "dir",
    "table", "group", "groupCollapsed", "groupEnd",
    "time", "timeEnd", "timeLog", "count", "countReset", "assert",
  ];
  const original = {};
  METHODS.forEach((m) => {
    original[m] = console[m];
  });

  const timers = new Map();
  const counts = new Map();
  let groupDepth = 0;

  const push = (type, parts, extra) => {
    const entry = { type, line: getLine(), depth: groupDepth, parts };
    if (extra) Object.assign(entry, extra);
    emit(entry);
  };
  const text = (v) => [{ k: "text", v }];

  console.log = (...a) => push("log", serializeArgs(a));
  console.info = (...a) => push("info", serializeArgs(a));
  console.warn = (...a) => push("warn", serializeArgs(a));
  console.error = (...a) => push("error", serializeArgs(a));
  console.debug = (...a) => push("log", serializeArgs(a));
  console.dir = (v) => push("log", [serializeArg(v)]);

  console.trace = (...a) => {
    const label = a.length ? serializeArgs(a) : text("Trace");
    const err = new Error();
    push("warn", label, { stack: stackTransformOrRaw(err.stack) });
  };

  console.table = (data, cols) => {
    try {
      push("log", [serializeTable(data, cols)]);
    } catch (e) {
      push("log", [serializeArg(data)]);
    }
  };

  console.group = (...a) => {
    push("group", a.length ? serializeArgs(a) : text("console.group"));
    groupDepth += 1;
  };
  console.groupCollapsed = console.group;
  console.groupEnd = () => {
    groupDepth = Math.max(0, groupDepth - 1);
  };

  console.time = (label = "default") => {
    const key = String(label);
    if (timers.has(key)) {
      push("warn", text(`Timer '${key}' already exists`));
      return;
    }
    timers.set(key, nowMs());
  };

  const readTimer = (label, remove) => {
    const key = String(label);
    if (!timers.has(key)) {
      push("warn", text(`Timer '${key}' does not exist`));
      return null;
    }
    const started = timers.get(key);
    if (remove) timers.delete(key);
    return { key, elapsed: nowMs() - started };
  };

  console.timeEnd = (label = "default") => {
    const t = readTimer(label, true);
    if (t) push("timing", text(`${t.key}: ${formatDuration(t.elapsed)}`));
  };

  console.timeLog = (label = "default", ...a) => {
    const t = readTimer(label, false);
    if (!t) return;
    push("timing", text(`${t.key}: ${formatDuration(t.elapsed)}`).concat(serializeArgs(a)));
  };

  console.count = (label = "default") => {
    const key = String(label);
    const next = (counts.get(key) || 0) + 1;
    counts.set(key, next);
    push("log", text(`${key}: ${next}`));
  };

  console.countReset = (label = "default") => {
    counts.set(String(label), 0);
  };

  console.assert = (condition, ...a) => {
    if (condition) return;
    const parts = text("Assertion failed");
    if (a.length) {
      parts.push({ k: "text", v: ":" });
      parts.push(...serializeArgs(a));
    }
    push("error", parts);
  };

  return function restoreConsole() {
    METHODS.forEach((m) => {
      console[m] = original[m];
    });
  };
}

/** console.trace stacks go through the same cleanup as thrown errors. */
function stackTransformOrRaw(stack) {
  try {
    const cleaned = serializeArg(Object.assign(new Error("x"), { stack }));
    return cleaned && cleaned.stack ? cleaned.stack : String(stack || "");
  } catch {
    return String(stack || "");
  }
}
