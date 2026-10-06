/* Shared site-wide behaviour for the single scrolling page: smooth scroll,
   a fade-through transition on section change (triggered by nav clicks
   AND by scrolling past a section's edge), scroll-based nav highlighting,
   and the generic reveal-on-scroll effect. */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SECTION_IDS = ['home', 'collection', 'shop', 'contact'];
  const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);

  // The 3D render is optional. If its external module is slow or blocked,
  // never let its opaque loading layer hide the Collection copy forever.
  const renderLoading = document.querySelector('.render-loading');
  if (renderLoading) {
    window.setTimeout(() => renderLoading.classList.add('is-hidden'), 1500);
  }

  // ---- Smooth scroll (Lenis, synced to GSAP's ticker) ----
  if (window.Lenis && !reduceMotion) {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });

    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
    window.__lenis = lenis;
  }

  // ---- Smooth-scroll to a section by id ----
  function scrollToSection(id, opts) {
    const el = document.getElementById(id);
    if (!el) return;
    const instant = opts && opts.instant;
    if (window.__lenis) {
      // Lenis ignores a duration-only jump while stopped. Start it before
      // the covered swap and use immediate mode so the destination is
      // updated before the overlay reveals the next section.
      if (instant) window.__lenis.start();
      window.__lenis.scrollTo(el, {
        duration: instant ? 0 : 1.2,
        immediate: !!instant,
      });
    } else {
      el.scrollIntoView({ behavior: instant || reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  // ---- Section navigation, with a fade-through overlay ----
  let activeIndex = 0;
  let isPageTransitioning = false;
  const pageTransition = document.getElementById('page-transition');

  function setActivePage(id) {
    document.body.dataset.page = id;
  }

  function goToSection(id) {
    if (isPageTransitioning) return; // ignore taps/clicks mid-fade

    const el = document.getElementById(id);
    if (!el) return;

    const targetIndex = SECTION_IDS.indexOf(id);
    if (targetIndex !== -1) activeIndex = targetIndex;

    // No fade animation available (reduced motion, GSAP missing, or the
    // overlay element itself missing) — just jump straight there.
    if (reduceMotion || !window.gsap || !pageTransition) {
      scrollToSection(id);
      setActivePage(id);
      history.replaceState(null, '', `#${id}`);
      return;
    }

    isPageTransitioning = true;
    gsap.set(pageTransition, { opacity: 0 });
    gsap
      .timeline({
        onComplete() {
          isPageTransitioning = false;
        },
      })
      // Fade in over the ending page.
      .to(pageTransition, { opacity: 1, duration: 0.45, ease: 'power1.inOut' })
      .call(() => {
        scrollToSection(id, { instant: true });
        setActivePage(id);
        history.replaceState(null, '', `#${id}`);
      })
      // Fade back out, revealing the new page underneath.
      .to(pageTransition, { opacity: 0, duration: 0.45, ease: 'power1.inOut' });
  }
  window.AlphaScrollTo = goToSection;

  // Intercept same-page anchor links (nav, footer, hero CTAs, category
  // strip, etc.) so they scroll within this single page. The admin link
  // (#admin) is handled by admin.js.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const targetId = link.getAttribute('href').slice(1);
    if (!targetId || targetId === 'admin') return;
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    e.preventDefault();
    goToSection(targetId);
  });

  // ---- Active nav link, based on which section is in view ----
  if (sections.length && 'IntersectionObserver' in window) {
    const navLinks = document.querySelectorAll('.nav-links a[data-section]');
    const setActive = (id) => {
      navLinks.forEach((a) => a.classList.toggle('active', a.dataset.section === id));
      const idx = SECTION_IDS.indexOf(id);
      if (idx !== -1) activeIndex = idx;
      setActivePage(id);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));
    setActive('home');
  }

  // ---- Scrolling past a section's own edge jumps straight to the
  // next/previous section;
  // scrolling that stays within a section's own content (many of them are
  // taller than one screen) is left completely alone. ----
  const adminOverlay = document.getElementById('admin-overlay');
  const EDGE_PX = 4;

  function adminIsOpen() {
    return !!(adminOverlay && adminOverlay.classList.contains('is-open'));
  }

  function tryEdgeAdvance(direction) {
    if (adminIsOpen() || reduceMotion || !sections.length) return false;

    const current = sections[activeIndex];
    if (!current) return false;
    const rect = current.getBoundingClientRect();

    if (direction > 0 && rect.bottom <= window.innerHeight + EDGE_PX && activeIndex < sections.length - 1) {
      goToSection(sections[activeIndex + 1].id);
      return true;
    }
    if (direction < 0 && rect.top >= -EDGE_PX && activeIndex > 0) {
      goToSection(sections[activeIndex - 1].id);
      return true;
    }
    return false;
  }

  window.addEventListener(
    'wheel',
    (e) => {
      const direction = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
      if (!direction) return;
      if (tryEdgeAdvance(direction)) e.preventDefault();
    },
    { passive: false }
  );

  let touchStartY = null;
  window.addEventListener(
    'touchstart',
    (e) => {
      touchStartY = e.touches && e.touches.length ? e.touches[0].clientY : null;
    },
    { passive: true }
  );
  window.addEventListener(
    'touchend',
    (e) => {
      if (touchStartY == null) return;
      const endY = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientY : touchStartY;
      const delta = touchStartY - endY; // positive = swiped up = scrolling down
      touchStartY = null;
      if (Math.abs(delta) < 40) return; // ignore taps / tiny drags
      tryEdgeAdvance(delta > 0 ? 1 : -1);
    },
    { passive: true }
  );

  // ---- Footer year ----
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // ---- Generic reveal-on-scroll for elements with [data-reveal] ----
  function initReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    if (reduceMotion || !window.gsap || !window.ScrollTrigger) {
      items.forEach((el) => {
        el.style.opacity = 1;
        el.style.transform = 'none';
      });
      return;
    }

    items.forEach((el, i) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        delay: (i % 4) * 0.08,
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        },
      });
    });
  }

  if (document.readyState !== 'loading') {
    initReveal();
  } else {
    document.addEventListener('DOMContentLoaded', initReveal);
  }

  // ---- Land on the right section if the URL already has a hash ----
  if (window.location.hash && window.location.hash !== '#admin') {
    window.addEventListener('load', () => {
      const idx = SECTION_IDS.indexOf(window.location.hash.slice(1));
      if (idx !== -1) activeIndex = idx;
      scrollToSection(window.location.hash.slice(1));
    });
  }
})();
