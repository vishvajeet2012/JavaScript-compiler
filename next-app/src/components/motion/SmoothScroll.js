'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis smooth scroll + GSAP ScrollTrigger reveal for [data-reveal] elements.
 */
export default function SmoothScroll({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.2,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const ticker = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    // Anchor links via Lenis
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -80, duration: 1.2 });
      if (window.location.hash !== id) {
        history.pushState(null, '', id);
      }
    };
    document.addEventListener('click', onClick);

    // Reveal animations
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        const delay = Number(el.getAttribute('data-reveal-delay') || 0);
        const y = Number(el.getAttribute('data-reveal-y') || 48);
        gsap.fromTo(
          el,
          { opacity: 0, y, filter: 'blur(6px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 1.05,
            delay,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          },
        );
      });

      gsap.utils.toArray('[data-reveal-stagger]').forEach((parent) => {
        const kids = parent.querySelectorAll('[data-reveal-child]');
        gsap.fromTo(
          kids,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: parent,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          },
        );
      });
    });

    // Refresh after fonts/images
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);

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
