'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchSite } from '@/lib/site-search';
import styles from './CommandSearch.module.css';

/**
 * Site search command palette.
 * Shortcut: Ctrl+K (Windows) / ⌘+K (Mac) — also Ctrl+/
 */
export default function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();

  const results = useMemo(() => searchSite(query), [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
  }, []);

  const openSearch = useCallback(() => {
    setOpen(true);
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 20);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      // Ctrl/⌘ + K or Ctrl/⌘ + /
      if (isMod && (e.key === 'k' || e.key === 'K' || e.key === '/')) {
        e.preventDefault();
        setOpen((v) => {
          if (v) {
            setQuery('');
            setActive(0);
            return false;
          }
          setTimeout(() => inputRef.current?.focus(), 20);
          return true;
        });
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const go = (item) => {
    if (!item) return;
    close();
    if (item.external || item.href.startsWith('http')) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
      return;
    }
    if (item.href.startsWith('/#')) {
      const hash = item.href.slice(1); // #section
      if (window.location.pathname === '/' || window.location.pathname === '') {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', hash);
          return;
        }
      }
      router.push(item.href.replace('/#', '/#'));
      window.location.href = item.href;
      return;
    }
    router.push(item.href);
  };

  if (!open) {
    return (
      <button
        type="button"
        className={styles.trigger}
        onClick={openSearch}
        title="Search (Ctrl+K)"
        aria-label="Open search"
      >
        <span className={styles.triggerIcon}>⌕</span>
        <span className={styles.triggerText}>Search</span>
        <kbd className={styles.kbd}>Ctrl K</kbd>
      </button>
    );
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Site search">
      <div className={styles.backdrop} onClick={close} />
      <div className={styles.panel}>
        <div className={styles.inputRow}>
          <span className={styles.searchIcon} aria-hidden>
            ⌕
          </span>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, docs, download…"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(results[active]);
              }
            }}
          />
          <kbd className={styles.kbd}>Esc</kbd>
        </div>

        <ul className={styles.list} role="listbox">
          {results.length === 0 ? (
            <li className={styles.empty}>No results for “{query}”</li>
          ) : (
            results.map((item, i) => (
              <li key={item.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className={`${styles.item} ${i === active ? styles.itemActive : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                >
                  <span className={styles.itemGroup}>{item.group}</span>
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemDesc}>{item.desc}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className={styles.footer}>
          <span>
            <kbd className={styles.kbd}>↑</kbd>
            <kbd className={styles.kbd}>↓</kbd> navigate
          </span>
          <span>
            <kbd className={styles.kbd}>Enter</kbd> open
          </span>
          <span>
            <kbd className={styles.kbd}>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
