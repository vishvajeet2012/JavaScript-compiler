'use client';

import { useEffect, useState } from 'react';
import styles from './Header.module.css';
import ServerStatus from './ServerStatus';
import CommandSearch from './CommandSearch';

export default function Header({ brand, serverOnline, health }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const logo = brand?.logo || 'JS';
  const name = brand?.name || 'JS Compiler';

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Download', href: '#download' },
    { label: 'Free vs Pro', href: '#compare' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Features', href: '#features' },
    { label: 'What’s New', href: '/changelog' },
    { label: 'JS Play', href: '/jsplay' },
    { label: 'Contact', href: '#contact' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <a href="#home" className={styles.logo} title={name}>
          <span className={styles.logoMark}>{logo}</span>
          <span>{name}</span>
        </a>

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={styles.navLink}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className={styles.statusMobile}>
            <ServerStatus online={serverOnline} health={health} />
          </div>
          <a
            href="#download"
            className={styles.ctaMobile}
            onClick={() => setMenuOpen(false)}
          >
            Download
          </a>
        </nav>

        <div className={styles.right}>
          <CommandSearch />
          <div className={styles.statusDesktop}>
            <ServerStatus online={serverOnline} health={health} />
          </div>
          <a href="#download" className={styles.cta}>
            Download
          </a>
        </div>

        <button
          type="button"
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen ? (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      ) : null}
    </header>
  );
}
