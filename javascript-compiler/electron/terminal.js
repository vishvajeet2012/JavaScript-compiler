/**
 * Simple (non-pty) integrated terminal.
 * Spawns one persistent shell process (cmd.exe / bash) with piped stdio.
 * Renderer handles local input echo; commands are sent as raw lines here.
 * Completion is detected via a unique marker + a cwd probe (cd / pwd)
 * appended after every command, so the caller can show a fresh prompt.
 */

const { spawn } = require("child_process");

let shellProc = null;
let lineBuffer = "";
let awaitingMarker = null;
let awaitingCwdNext = false;
let handlers = {};

function shellCommand() {
  // /Q disables command echo; PROMPT=$_ collapses cmd's prompt to a newline
  // so only the app's own prompt is visible.
  if (process.platform === "win32") return { cmd: "cmd.exe", args: ["/Q"] };
  return { cmd: process.env.SHELL || "/bin/bash", args: [] };
}

function isRunning() {
  return !!shellProc;
}

function stop() {
  if (shellProc) {
    try {
      shellProc.kill();
    } catch {
      /* ignore */
    }
    shellProc = null;
  }
  lineBuffer = "";
  awaitingMarker = null;
  awaitingCwdNext = false;
}

function handleLine(lineWithNl) {
  const plain = lineWithNl.replace(/\r?\n$/, "");
  if (awaitingMarker && plain.includes(awaitingMarker)) {
    // Command output may end without a newline, so the marker can be glued to
    // real output — emit that leading part before treating the marker as done.
    const before = plain.slice(0, plain.indexOf(awaitingMarker));
    if (before.trim() && handlers.onData) handlers.onData(`${before}\r\n`);
    awaitingCwdNext = true;
    return;
  }
  if (awaitingCwdNext) {
    awaitingCwdNext = false;
    awaitingMarker = null;
    if (handlers.onCwd) handlers.onCwd(plain.trim());
    if (handlers.onDone) handlers.onDone();
    return;
  }
  if (handlers.onData) handlers.onData(lineWithNl);
}

function handleChunk(text) {
  lineBuffer += text;
  let idx;
  while ((idx = lineBuffer.indexOf("\n")) !== -1) {
    const line = lineBuffer.slice(0, idx + 1);
    lineBuffer = lineBuffer.slice(idx + 1);
    handleLine(line);
  }
  // Flush a trailing partial line (e.g. a shell prompt with no newline)
  // immediately for a live feel, unless we're mid marker/cwd detection.
  if (lineBuffer && !awaitingMarker) {
    if (handlers.onData) handlers.onData(lineBuffer);
    lineBuffer = "";
  }
}

function start(cwd, h) {
  stop();
  handlers = h || {};
  const { cmd, args } = shellCommand();

  try {
    shellProc = spawn(cmd, args, {
      cwd,
      env: { ...process.env, PROMPT: "$_" },
      windowsHide: true,
      shell: false,
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  shellProc.stdout.on("data", (d) => handleChunk(d.toString()));
  shellProc.stderr.on("data", (d) => handleChunk(d.toString()));

  shellProc.on("error", (e) => {
    if (handlers.onData) {
      handlers.onData(`\r\n[terminal error] ${e.message}\r\n`);
    }
    stop();
    if (handlers.onExit) handlers.onExit(-1);
  });

  shellProc.on("exit", (code) => {
    shellProc = null;
    if (handlers.onExit) handlers.onExit(code);
  });

  if (handlers.onCwd) handlers.onCwd(cwd);
  return { ok: true, cwd };
}

function sendCommand(line) {
  if (!shellProc) return { ok: false, error: "Terminal not running" };
  const cmd = String(line || "");
  if (!cmd.trim()) return { ok: true };

  const marker = `__JSCOMP_DONE_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}__`;
  awaitingMarker = marker;
  const pwdCmd = process.platform === "win32" ? "cd" : "pwd";

  try {
    shellProc.stdin.write(`${cmd}\n`);
    shellProc.stdin.write(`echo ${marker}\n`);
    shellProc.stdin.write(`${pwdCmd}\n`);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  return { ok: true };
}

module.exports = { start, stop, sendCommand, isRunning };
