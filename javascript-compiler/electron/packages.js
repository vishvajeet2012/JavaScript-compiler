/**
 * Pro Node packages: npm install into userData/node-sandbox
 * Real require() works when running Node mode via child process.
 */

const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const activation = require("./activation");

// Serializer source, inlined into the child script. Plain `node` cannot read
// files inside an asar archive, so it is injected as text rather than required.
const INSPECT_SOURCE = fs
  .readFileSync(path.join(__dirname, "inspect.js"), "utf8")
  .replace(/module\.exports[\s\S]*$/, "");
const CONSOLE_SOURCE = fs.readFileSync(path.join(__dirname, "console-capture.js"), "utf8");

// Marks the child's structured result line so user stdout writes can't be
// mistaken for it.
const RESULT_PREFIX = "\u0000JSC";

/** Plain-text console entry in the structured log format. */
function textLog(type, text) {
  return { type, line: null, parts: [{ k: "text", v: text }] };
}

const SAFE_PKG =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[a-z0-9-._~+]+)?$/i;

function sandboxRoot() {
  const root = path.join(app.getPath("userData"), "node-sandbox");
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  const pkgJson = path.join(root, "package.json");
  if (!fs.existsSync(pkgJson)) {
    fs.writeFileSync(
      pkgJson,
      JSON.stringify(
        {
          name: "js-compiler-node-sandbox",
          version: "1.0.0",
          private: true,
          description: "User-installed npm packages for JS Compiler Node mode",
        },
        null,
        2,
      ),
      "utf8",
    );
  }
  return root;
}

function nodeModulesDir() {
  return path.join(sandboxRoot(), "node_modules");
}

function ensurePro() {
  if (!activation.isProActive()) {
    return {
      ok: false,
      error:
        "npm install is a Pro feature (Node mode). Activate Pro to install packages.",
    };
  }
  return { ok: true };
}

function validatePackageSpec(spec) {
  const s = String(spec || "").trim();
  if (!s || s.length > 120) return null;
  if (s.includes("..") || s.includes(" ") || s.includes(";") || s.includes("|")) {
    return null;
  }
  // allow name or name@version or @scope/name@version
  if (!SAFE_PKG.test(s)) return null;
  return s;
}

function listPackages() {
  const gate = ensurePro();
  const root = sandboxRoot();
  const nm = nodeModulesDir();
  if (!fs.existsSync(nm)) {
    return { ok: true, packages: [], path: root, pro: gate.ok };
  }
  const names = [];
  try {
    for (const entry of fs.readdirSync(nm, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      if (entry.name.startsWith("@")) {
        const scope = entry.name;
        const scoped = path.join(nm, scope);
        for (const sub of fs.readdirSync(scoped, { withFileTypes: true })) {
          if (sub.isDirectory()) names.push(`${scope}/${sub.name}`);
        }
      } else {
        names.push(entry.name);
      }
    }
  } catch {
    /* ignore */
  }
  names.sort((a, b) => a.localeCompare(b));
  return { ok: true, packages: names, path: root, pro: gate.ok };
}

/**
 * Collects the .d.ts files of installed packages so the editor can offer real
 * autocomplete for them. Files keep their node_modules-relative paths, which is
 * what Monaco's TypeScript worker needs to resolve `require('pkg')`.
 */
const TYPES_MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const TYPES_MAX_FILES = 400;
const TYPES_MAX_FILE_BYTES = 512 * 1024;

function collectTypeFiles(dir, relBase, out, budget) {
  if (budget.files >= TYPES_MAX_FILES || budget.bytes >= TYPES_MAX_TOTAL_BYTES) return;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (budget.files >= TYPES_MAX_FILES || budget.bytes >= TYPES_MAX_TOTAL_BYTES) return;
    // Skip nested dependency trees and test/fixture noise
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".bin" || entry.name === "test") continue;
      collectTypeFiles(path.join(dir, entry.name), `${relBase}/${entry.name}`, out, budget);
      continue;
    }
    if (!entry.name.endsWith(".d.ts")) continue;
    const full = path.join(dir, entry.name);
    try {
      const stat = fs.statSync(full);
      if (stat.size > TYPES_MAX_FILE_BYTES) continue;
      out.push({ path: `${relBase}/${entry.name}`, content: fs.readFileSync(full, "utf8") });
      budget.files += 1;
      budget.bytes += stat.size;
    } catch {
      /* unreadable — skip */
    }
  }
}

function listTypeDefinitions() {
  const nm = nodeModulesDir();
  if (!fs.existsSync(nm)) return { ok: true, files: [], packages: [] };

  const files = [];
  const budget = { files: 0, bytes: 0 };
  const packages = [];

  const addPackage = (pkgName) => {
    const pkgDir = path.join(nm, pkgName);
    let manifest = {};
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
    } catch {
      manifest = {};
    }
    const before = files.length;
    collectTypeFiles(pkgDir, pkgName, files, budget);
    if (files.length > before) {
      packages.push({ name: pkgName, types: manifest.types || manifest.typings || null });
    }
  };

  let entries = [];
  try {
    entries = fs.readdirSync(nm, { withFileTypes: true });
  } catch {
    return { ok: true, files: [], packages: [] };
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (entry.name.startsWith("@")) {
      let scoped = [];
      try {
        scoped = fs.readdirSync(path.join(nm, entry.name), { withFileTypes: true });
      } catch {
        scoped = [];
      }
      scoped.forEach((sub) => {
        if (sub.isDirectory()) addPackage(`${entry.name}/${sub.name}`);
      });
      continue;
    }
    addPackage(entry.name);
  }

  return { ok: true, files, packages, truncated: budget.files >= TYPES_MAX_FILES };
}

/**
 * npm install <spec> in sandbox (Pro only)
 */
function installPackage(spec, { timeoutMs = 120000 } = {}) {
  const gate = ensurePro();
  if (!gate.ok) return Promise.resolve(gate);

  const pkg = validatePackageSpec(spec);
  if (!pkg) {
    return Promise.resolve({
      ok: false,
      error: "Invalid package name. Example: lodash or lodash@4",
    });
  }

  const cwd = sandboxRoot();
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

  return new Promise((resolve) => {
    const args = [
      "install",
      pkg,
      "--save",
      "--no-fund",
      "--no-audit",
      "--loglevel=error",
    ];
    const child = spawn(npmCmd, args, {
      cwd,
      env: { ...process.env, npm_config_yes: "true" },
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        /* ignore */
      }
      resolve({
        ok: false,
        error: `npm install timed out after ${Math.round(timeoutMs / 1000)}s`,
        stdout,
        stderr,
      });
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        error:
          err.code === "ENOENT"
            ? "npm not found. Install Node.js (includes npm) on this machine."
            : err.message,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({
          ok: true,
          package: pkg,
          message: `Installed ${pkg}`,
          packages: listPackages().packages,
        });
      } else {
        resolve({
          ok: false,
          error: stderr.trim() || stdout.trim() || `npm install failed (code ${code})`,
          stdout,
          stderr,
        });
      }
    });
  });
}

function removePackage(spec) {
  const gate = ensurePro();
  if (!gate.ok) return Promise.resolve(gate);

  const pkg = validatePackageSpec(spec);
  if (!pkg) {
    return Promise.resolve({ ok: false, error: "Invalid package name" });
  }

  const cwd = sandboxRoot();
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

  return new Promise((resolve) => {
    const child = spawn(npmCmd, ["uninstall", pkg, "--save", "--loglevel=error"], {
      cwd,
      windowsHide: true,
      shell: false,
    });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      resolve({
        ok: false,
        error:
          err.code === "ENOENT"
            ? "npm not found. Install Node.js on this machine."
            : err.message,
      });
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          ok: true,
          message: `Removed ${pkg}`,
          packages: listPackages().packages,
        });
      } else {
        resolve({ ok: false, error: stderr.trim() || `npm uninstall failed` });
      }
    });
  });
}

/**
 * Run user Node code with real require() resolving to sandbox node_modules.
 */
function runNodeCode(code, { timeoutMs = 10000 } = {}) {
  const gate = ensurePro();
  if (!gate.ok) {
    return Promise.resolve({
      success: false,
      logs: [textLog("error", `🔒 ${gate.error}`)],
      blocked: true,
      proRequired: true,
    });
  }

  const cwd = sandboxRoot();
  // Prefer system `node` for real modules; running electron as node is risky
  const tryNode = process.platform === "win32" ? "node.exe" : "node";

  const runnerScript = `
${INSPECT_SOURCE}
${CONSOLE_SOURCE}

const Module = require('module');
const path = require('path');
const cwd = process.cwd();
const nm = path.join(cwd, 'node_modules');
const orig = Module._nodeModulePaths;
Module._nodeModulePaths = function(from) {
  const paths = orig.call(this, from);
  if (!paths.includes(nm)) paths.unshift(nm);
  return paths;
};

const logs = [];
let stackOffset = null;
installConsoleCapture({
  emit: (entry) => logs.push(entry),
  getLine: () =>
    stackOffset === null ? null : userLineFromStack(new Error().stack, stackOffset, 0),
});

const emit = (payload) => {
  process.stdout.write('\\u0000JSC' + JSON.stringify(payload) + '\\n');
};

(async () => {
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  const source = ${JSON.stringify(String(code || ""))};
  let fn;
  try {
    try { fn = new AsyncFunction(source); stackOffset = measureLineOffset(AsyncFunction); }
    catch { fn = new Function(source); stackOffset = measureLineOffset(Function); }
    if (stackOffset !== null) setStackTransform((s) => cleanStack(s, stackOffset, 0));
  } catch (e) {
    logs.push({ type: 'error', line: null, parts: [serializeArg(e)] });
    emit({ success: false, logs });
    return;
  }
  try {
    let result = fn();
    if (result && typeof result.then === 'function') result = await result;
    if (result !== undefined) {
      logs.push({ type: 'result', line: null, parts: [serializeArg(result)] });
    }
    emit({ success: true, logs });
  } catch (e) {
    logs.push({
      type: 'error',
      line: stackOffset === null ? null : userLineFromStack(e && e.stack, stackOffset, 0),
      parts: [serializeArg(e)],
    });
    emit({ success: false, logs });
  }
})();
`;

  return new Promise((resolve) => {
    const child = spawn(tryNode, ["-e", runnerScript], {
      cwd,
      env: {
        ...process.env,
        NODE_PATH: nodeModulesDir(),
      },
      windowsHide: true,
      shell: false,
    });

    let out = "";
    let err = "";
    let settled = false;
    const done = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      resolve(payload);
    };

    const timer = setTimeout(() => {
      done({
        success: false,
        stopped: true,
        timedOut: true,
        logs: [textLog("error", `⛔ Auto-paused — Node script timeout (${timeoutMs / 1000}s)`)],
      });
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      err += d.toString();
    });

    child.on("error", (e) => {
      if (e.code === "ENOENT") {
        // System node missing — run with fake sandbox note
        done({
          success: false,
          logs: [
            textLog(
              "error",
              "Node.js not found on PATH. Install Node.js from https://nodejs.org so npm install and package require() work.",
            ),
          ],
        });
        return;
      }
      done({ success: false, logs: [textLog("error", e.message)] });
    });

    child.on("close", () => {
      // The child's structured result is the line tagged with RESULT_PREFIX;
      // anything else the user wrote to stdout is shown as its own log line.
      const lines = out.split("\n");
      let parsed = null;
      const rawStdout = [];
      for (const line of lines) {
        const idx = line.indexOf(RESULT_PREFIX);
        if (idx !== -1) {
          if (idx > 0) rawStdout.push(line.slice(0, idx));
          try {
            parsed = JSON.parse(line.slice(idx + RESULT_PREFIX.length));
          } catch {
            /* keep looking */
          }
          continue;
        }
        if (line.trim()) rawStdout.push(line);
      }

      if (!parsed) {
        done({
          success: false,
          logs: [textLog("error", err.trim() || out.trim() || "Node process failed")],
        });
        return;
      }

      parsed.logs = parsed.logs || [];
      if (rawStdout.length) {
        parsed.logs = rawStdout
          .map((t) => textLog("log", t))
          .concat(parsed.logs);
      }
      if (err.trim()) {
        parsed.logs.push(textLog("warn", err.trim().slice(0, 500)));
      }
      done(parsed);
    });
  });
}

module.exports = {
  sandboxRoot,
  nodeModulesDir,
  listPackages,
  listTypeDefinitions,
  installPackage,
  removePackage,
  runNodeCode,
  validatePackageSpec,
};
