'use client';

import { useState } from 'react';
import styles from './Header.module.css';
import ServerStatus from './ServerStatus';

export default function Header({ brand, serverOnline, health, scrolled }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const logo = brand?.logo || 'JS';
  const name = brand?.name || 'JS Compiler';

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'JS Play', href: '/jsplay' },
    { label: 'Download', href: '#download' },
    { label: 'Releases', href: '/releases' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Features', href: '#features' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <a href="#home" className={styles.logo} title={name}>
          {logo}
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
          <div className={styles.statusDesktop}>
            <ServerStatus online={serverOnline} health={health} />
          </div>
          <a href="#download" className={styles.cta}>
            Download
          </a>
        </div>

        <button
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      )}
    </header>
  );
}
