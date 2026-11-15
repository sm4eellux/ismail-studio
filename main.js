/* main.js — site-wide settings, navigation, footer year.
   >>> Edit SITE below to update contact details everywhere. <<< */
const SITE = {
  email: 'ismailtesh999@gmail.com',            // replace with your real email
  whatsapp: '2126',                    // international format, digits only
  linkedin: 'https://www.linkedin.com/in/ismail-bk-a42a1544b',
  github: 'https://github.com/sm4eellux',
  available: true,                             // toggles the availability indicator
  availableText: 'Available for new projects',
  busyText: 'Currently fully booked'
};
window.SITE = SITE;

(function () {
  'use strict';
  // Fill contact links/text from SITE so details live in one place.
  const map = {
    email: ['mailto:' + SITE.email, SITE.email],
    whatsapp: ['https://wa.me/' + SITE.whatsapp, '+' + SITE.whatsapp],
    linkedin: [SITE.linkedin, 'LinkedIn'],
    github: [SITE.github, 'GitHub']
  };
  document.querySelectorAll('[data-contact]').forEach(function (el) {
    const m = map[el.dataset.contact];
    if (!m) return;
    el.setAttribute('href', m[0]);
    if (el.hasAttribute('data-contact-text')) el.textContent = m[1];
    if (el.dataset.contact !== 'email') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
  });
  document.querySelectorAll('[data-status]').forEach(function (el) {
    el.textContent = SITE.available ? SITE.availableText : SITE.busyText;
    const dot = el.previousElementSibling;
    if (dot && !SITE.available) dot.style.background = '#FBBF24';
  });
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Sticky nav: transparent -> dark after scrolling.
  const nav = document.querySelector('.nav');
  const onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 30); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu.
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('mobile-menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    menu.toggleAttribute('inert', !open);
  }
  if (burger && menu) {
    setMenu(false);
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.matchMedia('(min-width:901px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }
})();
