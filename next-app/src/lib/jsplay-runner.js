/**
 * Browser-side JS runner with hard timeout (infinite-loop auto-pause).
 * Runs in a Web Worker so the main UI stays responsive.
 */

export const DEFAULT_TIMEOUT_SEC = 5;
export const MIN_TIMEOUT_SEC = 1;
export const MAX_TIMEOUT_SEC = 30;

export const DEFAULT_CODE = `// JS Play — write JavaScript and hit Run
// Infinite loops auto-pause after the timeout (like desktop JS Compiler)

console.log("Hello from JS Play!");

const sum = [1, 2, 3, 4, 5].reduce((a, b) => a + b, 0);
console.log("Sum:", sum);

// Uncomment to test auto-pause:
// while (true) {}
`;

/**
 * Build worker source that captures console + runs user code with timeout.
 */
function buildWorkerSource() {
  return `
    self.onmessage = async (e) => {
      const { code, timeoutMs } = e.data || {};
      const logs = [];
      const push = (type, args) => {
        try {
          logs.push({
            type,
            text: args.map((a) => {
              if (typeof a === 'string') return a;
              if (a instanceof Error) return a.stack || a.message;
              try { return JSON.stringify(a, null, 0); } catch { return String(a); }
            }).join(' '),
          });
        } catch {
          logs.push({ type, text: '[unserializable log]' });
        }
      };

      const orig = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      };
      console.log = (...a) => push('log', a);
      console.info = (...a) => push('info', a);
      console.warn = (...a) => push('warn', a);
      console.error = (...a) => push('error', a);
      console.debug = (...a) => push('debug', a);

      let settled = false;
      const finish = (payload) => {
        if (settled) return;
        settled = true;
        console.log = orig.log;
        console.info = orig.info;
        console.warn = orig.warn;
        console.error = orig.error;
        console.debug = orig.debug;
        self.postMessage(payload);
      };

      const timer = setTimeout(() => {
        finish({
          success: false,
          stopped: true,
          timedOut: true,
          logs: logs.concat({
            type: 'error',
            text: '⛔ Auto-paused — possible infinite loop or timeout (' + (timeoutMs / 1000) + 's). UI is safe.',
          }),
        });
        // Worker cannot stop itself mid-sync loop; parent will terminate.
      }, timeoutMs);

      try {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        let fn;
        try {
          fn = new AsyncFunction(code);
        } catch {
          fn = new Function(code);
        }
        let result = fn();
        if (result && typeof result.then === 'function') {
          result = await result;
        }
        if (result !== undefined) {
          push('result', [result]);
        }
        clearTimeout(timer);
        finish({ success: true, stopped: false, timedOut: false, logs });
      } catch (err) {
        clearTimeout(timer);
        push('error', [err && err.message ? err.message : String(err)]);
        finish({ success: false, stopped: false, timedOut: false, logs });
      }
    };
  `;
}

/**
 * Run user code in an isolated worker.
 * @param {string} code
 * @param {{ timeoutSec?: number, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ success: boolean, stopped: boolean, timedOut: boolean, logs: Array }>}
 */
export function runInWorker(code, opts = {}) {
  const timeoutSec = Math.min(
    MAX_TIMEOUT_SEC,
    Math.max(MIN_TIMEOUT_SEC, Number(opts.timeoutSec) || DEFAULT_TIMEOUT_SEC),
  );
  const timeoutMs = timeoutSec * 1000;

  return new Promise((resolve) => {
    let settled = false;
    let worker;
    let blobUrl;
    let killTimer;

    const done = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      try {
        worker?.terminate();
      } catch {
        /* ignore */
      }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      if (opts.signal) {
        opts.signal.removeEventListener('abort', onAbort);
      }
      resolve(payload);
    };

    const onAbort = () => {
      done({
        success: false,
        stopped: true,
        timedOut: false,
        logs: [{ type: 'warn', text: '⏹ Execution stopped by user.' }],
      });
    };

    if (opts.signal?.aborted) {
      onAbort();
      return;
    }
    if (opts.signal) opts.signal.addEventListener('abort', onAbort);

    try {
      const blob = new Blob([buildWorkerSource()], {
        type: 'application/javascript',
      });
      blobUrl = URL.createObjectURL(blob);
      worker = new Worker(blobUrl);

      // Parent-side kill: only way to stop a tight while(true) in the worker
      killTimer = setTimeout(() => {
        done({
          success: false,
          stopped: true,
          timedOut: true,
          logs: [
            {
              type: 'error',
              text: `⛔ Auto-paused — possible infinite loop or timeout (${timeoutSec}s). UI is safe.`,
            },
          ],
        });
      }, timeoutMs + 80);

      worker.onmessage = (ev) => {
        const data = ev.data || {};
        done({
          success: Boolean(data.success),
          stopped: Boolean(data.stopped),
          timedOut: Boolean(data.timedOut),
          logs: Array.isArray(data.logs) ? data.logs : [],
        });
      };

      worker.onerror = (err) => {
        done({
          success: false,
          stopped: false,
          timedOut: false,
          logs: [
            {
              type: 'error',
              text: err?.message || 'Worker error',
            },
          ],
        });
      };

      worker.postMessage({ code: String(code || ''), timeoutMs });
    } catch (err) {
      done({
        success: false,
        stopped: false,
        timedOut: false,
        logs: [
          {
            type: 'error',
            text: err?.message || 'Could not start runner',
          },
        ],
      });
    }
  });
}
