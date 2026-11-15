/* animations.js — GSAP + ScrollTrigger. If GSAP fails to load (or reduced motion is on), nothing is hidden and the site still works. */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap) { window.initReveals = function () {}; return; }
  const hasST = !!window.ScrollTrigger;
  if (hasST) gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('js-anim');

  // Scroll-triggered reveals for [data-reveal]. Safe to call again after rendering new cards.
  window.initReveals = function (root) {
    (root || document).querySelectorAll('[data-reveal]:not([data-done])').forEach(function (el) {
      el.setAttribute('data-done', '');
      const vars = { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: parseFloat(el.dataset.delay || 0) };
      if (hasST) vars.scrollTrigger = { trigger: el, start: 'top 90%', once: true };
      const isImg = el.matches('.case-hero,.shots img');
      gsap.fromTo(el, isImg ? { opacity: 0, y: 40, scale: 1.02 } : { opacity: 0, y: 32 }, isImg ? Object.assign(vars, { scale: 1 }) : vars);
    });
  };
  window.initReveals(document);

  // Cinematic hero: split headline into words, then one orchestrated entrance.
  const h1 = document.querySelector('[data-split]');
  if (h1) {
    const words = h1.textContent.trim().split(/\s+/);
    h1.setAttribute('aria-label', words.join(' '));
    h1.innerHTML = words.map(function (w) { return '<span class="word" aria-hidden="true"><span>' + w + '</span></span>'; }).join(' ');
    h1.style.opacity = 1;
    gsap.from(h1.querySelectorAll('.word>span'), { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.07, delay: 0.25 });
  }
  const hero = document.querySelectorAll('[data-hero]:not([data-split])');
  gsap.fromTo(hero, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, delay: 0.5 });

  // Process timeline: progress line follows scroll.
  const prog = document.querySelector('.timeline .progress');
  if (prog && hasST) {
    gsap.fromTo(prog, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: 0.4 } });
  } else if (prog) { prog.style.transform = 'scaleY(1)'; }
})();
