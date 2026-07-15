'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './JsPlayground.module.css';
import LogoMark from '@/components/LogoMark';
import {
  DEFAULT_CODE,
  DEFAULT_TIMEOUT_SEC,
  MAX_TIMEOUT_SEC,
  MIN_TIMEOUT_SEC,
  runInWorker,
} from '@/lib/jsplay-runner';

const STORAGE_KEY = 'jsplay-playground-v1';

function loadState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(partial) {
  if (typeof window === 'undefined') return;
  try {
    const prev = loadState() || {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...prev,
        ...partial,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

export default function JsPlayground() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [timeoutSec, setTimeoutSec] = useState(DEFAULT_TIMEOUT_SEC);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const abortRef = useRef(null);
  const saveTimer = useRef(null);

  // Restore from localStorage after mount (SSR-safe)
  useEffect(() => {
    const saved = loadState();
    if (saved?.code != null && typeof saved.code === 'string') {
      setCode(saved.code);
    }
    if (saved?.timeoutSec != null) {
      const n = Number(saved.timeoutSec);
      if (Number.isFinite(n)) {
        setTimeoutSec(
          Math.min(MAX_TIMEOUT_SEC, Math.max(MIN_TIMEOUT_SEC, n)),
        );
      }
    }
    setHydrated(true);
  }, []);

  // Debounced persist — survives refresh / tab close
  useEffect(() => {
    if (!hydrated) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveState({ code, timeoutSec });
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 900);
    }, 350);
    return () => clearTimeout(saveTimer.current);
  }, [code, timeoutSec, hydrated]);

  // Flush on page hide / refresh
  useEffect(() => {
    if (!hydrated) return;
    const flush = () => saveState({ code, timeoutSec });
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    return () => window.removeEventListener('beforeunload', flush);
  }, [code, timeoutSec, hydrated]);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setRunning(false);
  }, []);

  const run = useCallback(async () => {
    if (running) return;
    stop();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setLogs([{ type: 'info', text: 'Running…' }]);

    const result = await runInWorker(code, {
      timeoutSec,
      signal: controller.signal,
    });

    if (controller.signal.aborted) {
      setLogs((prev) =>
        prev[0]?.text === 'Running…'
          ? [{ type: 'warn', text: '⏹ Execution stopped by user.' }]
          : prev,
      );
    } else {
      const nextLogs = Array.isArray(result.logs) ? result.logs : [];
      if (result.timedOut && nextLogs.length === 0) {
        setLogs([
          {
            type: 'error',
            text: `⛔ Auto-paused — possible infinite loop or timeout (${timeoutSec}s). UI is safe.`,
          },
        ]);
      } else if (nextLogs.length === 0 && result.success) {
        setLogs([{ type: 'info', text: '(no console output)' }]);
      } else {
        setLogs(nextLogs);
      }
    }

    setRunning(false);
    abortRef.current = null;
  }, [code, timeoutSec, running, stop]);

  // Ctrl/Cmd + Enter to run
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);

  const clearConsole = () => setLogs([]);
  const resetCode = () => {
    if (confirm('Reset editor to the default sample code?')) {
      setCode(DEFAULT_CODE);
      setLogs([]);
    }
  };

  const logClass = (type) => {
    if (type === 'error') return styles.logError;
    if (type === 'warn') return styles.logWarn;
    if (type === 'result') return styles.logResult;
    if (type === 'info') return styles.logInfo;
    return styles.logLog;
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <a href="/jsplay" className={styles.brand} aria-label="JS Play home">
          <LogoMark className={styles.logoSvg} size={28} title="JS Compiler" />
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>JS PLAY</span>
            <span className={styles.brandSub}>Online playground · JS Compiler</span>
          </span>
        </a>
        <nav className={styles.nav} aria-label="Playground">
          <a className={styles.navLink} href="/">
            Home
          </a>
          <a className={styles.navLink} href="/#download">
            Desktop app
          </a>
          <a className={styles.navCta} href="/#download">
            Download
          </a>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <div>
            <h1>JavaScript Playground</h1>
            <p>
              Write and run JS in the browser. Infinite loops auto-pause after the
              timeout — same safety idea as the desktop JS Compiler. Your code is
              saved in this browser only.
            </p>
          </div>
          <div className={styles.badgeRow}>
            <span className={`${styles.badge} ${styles.badgeAccent}`}>
              Free · No login
            </span>
            <span className={`${styles.badge} ${styles.badgeOk}`}>
              Auto-pause loops
            </span>
            <span className={styles.badge}>localStorage</span>
          </div>
        </div>

        <div className={styles.toolbar} role="toolbar" aria-label="Editor actions">
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={run}
            disabled={running}
            title="Ctrl+Enter"
          >
            {running ? 'Running…' : '▶ Run'}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={stop}
            disabled={!running}
          >
            ⏹ Stop
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={clearConsole}
          >
            Clear console
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={resetCode}
          >
            Reset sample
          </button>

          <label className={styles.timeoutLabel}>
            <span>Timeout</span>
            <input
              type="number"
              min={MIN_TIMEOUT_SEC}
              max={MAX_TIMEOUT_SEC}
              value={timeoutSec}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isFinite(n)) return;
                setTimeoutSec(
                  Math.min(MAX_TIMEOUT_SEC, Math.max(MIN_TIMEOUT_SEC, n)),
                );
              }}
              aria-label="Execution timeout in seconds"
            />
            <span>s</span>
          </label>

          <span className={styles.toolbarSpacer} />

          <span
            className={`${styles.statusPill} ${
              running
                ? styles.statusRunning
                : saveFlash
                  ? styles.statusSaved
                  : styles.statusIdle
            }`}
          >
            {running
              ? 'Running'
              : saveFlash
                ? 'Saved locally'
                : hydrated
                  ? 'Ready'
                  : 'Loading…'}
          </span>
        </div>

        <div className={styles.workspace}>
          <section className={styles.panel} aria-label="Code editor">
            <div className={styles.panelHead}>
              <h2>Editor</h2>
              <span className={styles.panelMeta}>Ctrl + Enter to run</span>
            </div>
            <textarea
              className={styles.editor}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              aria-label="JavaScript source"
              placeholder="// Write JavaScript here…"
            />
          </section>

          <section className={styles.panel} aria-label="Console output">
            <div className={styles.panelHead}>
              <h2>Console</h2>
              <span className={styles.panelMeta}>
                {logs.length ? `${logs.length} line(s)` : 'empty'}
              </span>
            </div>
            <div className={styles.console} role="log" aria-live="polite">
              {logs.length === 0 ? (
                <p className={styles.consoleEmpty}>
                  Output appears here. Infinite loops auto-pause after the timeout.
                </p>
              ) : (
                logs.map((line, i) => (
                  <div
                    key={`${i}-${line.type}-${line.text?.slice?.(0, 24)}`}
                    className={`${styles.logLine} ${logClass(line.type)}`}
                  >
                    <span className={styles.logTag}>{line.type || 'log'}</span>
                    <span className={styles.logText}>{line.text}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          <span>
            Code stays in your browser ({STORAGE_KEY}) — refresh-safe, not uploaded.
          </span>
          <span>
            Want folders, offline mode & Pro?{' '}
            <a href="/#download">Download JS Compiler</a>
          </span>
        </footer>
      </main>
    </div>
  );
}
