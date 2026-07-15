/**
 * Pro Node packages: npm install into userData/node-sandbox
 * Real require() works when running Node mode via child process.
 */

const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const activation = require("./activation");

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
      logs: [{ type: "error", text: `🔒 ${gate.error}` }],
      blocked: true,
      proRequired: true,
    });
  }

  const cwd = sandboxRoot();
  const nodeBin = process.execPath; // Electron binary — use system node if available
  // Prefer system `node` for real modules; fall back to electron as node is risky
  const tryNode = process.platform === "win32" ? "node.exe" : "node";

  const runnerScript = `
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
const push = (type, args) => {
  logs.push({
    type,
    text: args.map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.stack || a.message;
      try { return JSON.stringify(a); } catch { return String(a); }
    }).join(' '),
  });
};
console.log = (...a) => push('log', a);
console.info = (...a) => push('info', a);
console.warn = (...a) => push('warn', a);
console.error = (...a) => push('error', a);
(async () => {
  try {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    let fn;
    try { fn = new AsyncFunction(${JSON.stringify(String(code || ""))}); }
    catch { fn = new Function(${JSON.stringify(String(code || ""))}); }
    let result = fn();
    if (result && typeof result.then === 'function') result = await result;
    if (result !== undefined) push('result', [result]);
    process.stdout.write(JSON.stringify({ success: true, logs }) + '\\n');
  } catch (e) {
    push('error', [e && e.message ? e.message : String(e)]);
    process.stdout.write(JSON.stringify({ success: false, logs }) + '\\n');
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
        logs: [
          {
            type: "error",
            text: `⛔ Auto-paused — Node script timeout (${timeoutMs / 1000}s)`,
          },
        ],
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
            {
              type: "error",
              text:
                "Node.js not found on PATH. Install Node.js from https://nodejs.org so npm install and package require() work.",
            },
          ],
        });
        return;
      }
      done({
        success: false,
        logs: [{ type: "error", text: e.message }],
      });
    });

    child.on("close", () => {
      const lines = out
        .trim()
        .split("\n")
        .filter(Boolean);
      const last = lines[lines.length - 1];
      try {
        const parsed = JSON.parse(last);
        if (err.trim()) {
          parsed.logs = parsed.logs || [];
          parsed.logs.push({ type: "warn", text: err.trim().slice(0, 500) });
        }
        done(parsed);
      } catch {
        done({
          success: false,
          logs: [
            {
              type: "error",
              text: err.trim() || out.trim() || "Node process failed",
            },
          ],
        });
      }
    });
  });
}

module.exports = {
  sandboxRoot,
  nodeModulesDir,
  listPackages,
  installPackage,
  removePackage,
  runNodeCode,
  validatePackageSpec,
};
