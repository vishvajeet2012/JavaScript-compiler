'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis smooth scroll + restrained GSAP reveals (no blur / glow spam).
 */
export default function SmoothScroll({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.95,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.1,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const ticker = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -72, duration: 1.05 });
      if (window.location.hash !== id) {
        history.replaceState(null, '', id);
      }
    };
    document.addEventListener('click', onClick);

    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        const delay = Number(el.getAttribute('data-reveal-delay') || 0);
        gsap.fromTo(
          el,
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            delay,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 92%',
              toggleActions: 'play none none none',
            },
          },
        );
      });

      gsap.utils.toArray('[data-reveal-stagger]').forEach((parent) => {
        const kids = parent.querySelectorAll('[data-reveal-child]');
        gsap.fromTo(
          kids,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.06,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: parent,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          },
        );
      });
    });

    const t = setTimeout(() => ScrollTrigger.refresh(), 350);

    return () => {
      clearTimeout(t);
      document.removeEventListener('click', onClick);
      ctx.revert();
      gsap.ticker.remove(ticker);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  return children;
}
