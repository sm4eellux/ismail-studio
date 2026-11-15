/* projects.js — ALL project data lives here. Add / edit / remove objects in PROJECTS; no HTML changes needed.
   liveUrl: put the real demo URL, or leave '' to show a disabled "Demo coming soon" button. */
const PROJECTS = [
  { id: 'restaurant', title: 'Maison Élégance Restaurant', category: 'Hospitality',
    description: 'An elegant, multi-page restaurant website with menu, gallery, table reservations and contact information.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=85', technologies: ['HTML5', 'CSS3', 'JavaScript'], liveUrl: 'projects/restaurant/index.html',
    details: {
      overview: 'Maison Élégance is a complete restaurant website concept. Visitors can explore the restaurant, browse the menu and gallery, make a reservation enquiry, and find contact information.',
      objectives: ['Present the restaurant and its atmosphere.', 'Make the menu easy to browse.', 'Provide clear paths to reservations and contact.'],
      design: ['Elegant restaurant-focused visual identity.', 'Responsive layouts for desktop and mobile.', 'Consistent navigation across the website pages.'],
      development: ['Multi-page HTML, CSS and JavaScript structure.', 'Dedicated menu, gallery, reservations and contact pages.', 'Responsive styling and interactive page scripts.'],
      gallery: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=85', 'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1600&q=85'] } },
  { id: 'barber', title: 'NOIR — The Gentlemen’s Barber Club', category: 'Lifestyle',
    description: 'A premium barber club website with services, barber profiles, pricing and appointment booking.',
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=85', technologies: ['HTML5', 'CSS3', 'JavaScript', 'Three.js', 'GSAP'], liveUrl: 'projects/barber/index.html',
    details: {
      overview: 'NOIR is a luxury barber club concept. Visitors can explore grooming services, meet the barbers, compare packages and send a booking enquiry.',
      objectives: ['Present the barber club with a distinctive premium identity.', 'Explain grooming services and packages clearly.', 'Make appointment enquiries straightforward.'],
      design: ['Dark, editorial visual direction with premium typography.', 'Responsive layouts and focused calls to action.', 'Dedicated pages for services, pricing, barbers and booking.'],
      development: ['Multi-page HTML, CSS and JavaScript website.', 'Service and barber content driven by a shared data file.', 'Interactive booking flow with demo-mode confirmation.'],
      gallery: ['https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1600&q=85', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1600&q=85'] } },
  { id: 'fitness', title: 'Fitness & Gym Website', category: 'Fitness',
    description: 'An energetic gym website with programs, trainers and a membership enquiry path.',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=85', technologies: ['HTML5', 'CSS3', 'JavaScript', 'GSAP'], liveUrl: 'projects/fitness/index.html',
    details: {
      overview: 'A demonstration concept for a gym that needs to feel energetic while staying easy to navigate.',
      objectives: ['Present programs and schedules clearly.', 'Build trust with trainer profiles.', 'Make joining or asking questions effortless.'],
      design: ['Bold type and high-contrast colour blocks.', 'Diagonal energy kept to a few key moments.', 'Large tap targets for mobile use.'],
      development: ['Program filtering with vanilla JavaScript.', 'Scroll-triggered counters and reveals.', 'Fully responsive layout.'],
      gallery: ['https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1600&q=85', 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1600&q=85'] } },
  { id: 'corporate', title: 'NEXORA — Corporate Business Website', category: 'Business',
    description: 'A premium multi-page corporate website concept featuring services, solutions, industries, team, insights and careers.',
    image: 'projects/corporate/assets/images/preview.jpg', technologies: ['HTML5', 'CSS3', 'JavaScript', 'GSAP', 'Three.js'], liveUrl: 'projects/corporate/index.html',
    details: {
      overview: 'NEXORA is a fictional corporate consulting website concept. It presents a complete business presence with service and solution pages, industry information, team profiles, insights, careers and contact pathways.',
      objectives: ['Communicate the company positioning and value clearly.', 'Organise services, solutions and industries into an easy-to-explore structure.', 'Build trust through team, insights and company information.', 'Provide clear contact and enquiry pathways.'],
      design: ['Premium corporate visual identity with a restrained colour palette.', 'Consistent navigation and reusable page components.', 'Responsive layouts with accessible interactions and motion preferences.'],
      development: ['Nine-page HTML, CSS and vanilla JavaScript website.', 'Interactive services, solutions, industries, insights and team content.', 'GSAP and Three.js enhancements with static fallbacks.', 'Form validation with honest demo-mode messaging until delivery services are configured.'],
      gallery: ['projects/corporate/assets/images/preview-2.jpg', 'projects/corporate/assets/images/preview-3.jpg'] } }

];

(function () {
  'use strict';
  const esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  const reveal = function (root) { if (window.initReveals) window.initReveals(root); };

  function card(p) {
    const live = p.liveUrl
      ? '<a class="link" href="' + esc(p.liveUrl) + '" target="_blank" rel="noopener noreferrer">View live demo <span aria-hidden="true">↗</span></a>'
      : '<span class="muted-note">Live demo coming soon</span>';
    return '<article class="card" data-reveal>' +
      '<a class="card-media" href="project-details.html?id=' + encodeURIComponent(p.id) + '" aria-label="Project details: ' + esc(p.title) + '">' +
      '<span class="badge">Demo project</span>' +
      '<img src="' + esc(p.image) + '" alt="Mockup of the ' + esc(p.title) + ' demo" width="1600" height="1000" loading="lazy"></a>' +
      '<div class="card-meta"><span>' + esc(p.category) + '</span></div>' +
      '<h3>' + esc(p.title) + '</h3><p>' + esc(p.description) + '</p>' +
      '<ul class="tags">' + p.technologies.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      '<div class="card-actions">' + live +
      '<a class="link" href="project-details.html?id=' + encodeURIComponent(p.id) + '">View project details <span aria-hidden="true">→</span></a></div></article>';
  }

  // Featured projects (home page): <div data-featured data-limit="3">
  const featured = document.querySelector('[data-featured]');
  if (featured) {
    const n = parseInt(featured.dataset.limit || '3', 10);
    featured.innerHTML = PROJECTS.slice(0, n).map(card).join('');
    reveal(featured);
  }

  // Work page grid + filters.
  const grid = document.getElementById('project-grid');
  const bar = document.getElementById('filters');
  if (grid && bar) {
    const cats = ['All'].concat(PROJECTS.map(function (p) { return p.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
    bar.innerHTML = cats.map(function (c, i) { return '<button type="button" class="chip-btn" aria-pressed="' + (i === 0) + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
    const status = document.getElementById('filter-status');
    function render(cat) {
      const list = cat === 'All' ? PROJECTS : PROJECTS.filter(function (p) { return p.category === cat; });
      grid.innerHTML = list.map(card).join('');
      if (status) status.textContent = 'Showing ' + list.length + (list.length === 1 ? ' project' : ' projects') + (cat === 'All' ? '' : ' in ' + cat);
      reveal(grid);
    }
    bar.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-cat]');
      if (!b) return;
      bar.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      render(b.dataset.cat);
    });
    render('All');
  }

  // Project details: project-details.html?id=restaurant
  const detail = document.getElementById('case-study');
  if (detail) {
    const id = new URLSearchParams(location.search).get('id');
    const i = PROJECTS.findIndex(function (p) { return p.id === id; });
    if (i < 0) {
      document.title = 'Project not found — ISMAIL.STUDIO';
      detail.innerHTML = '<div class="notfound"><h1>404</h1><h2>This project doesn’t exist.</h2><p class="lead">The link may be outdated or the project was removed. Browse the current projects instead.</p><a class="btn btn-primary" href="work.html">Back to all work <span class="arr" aria-hidden="true">→</span></a></div>';
    } else {
      const p = PROJECTS[i], d = p.details;
      const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length], next = PROJECTS[(i + 1) % PROJECTS.length];
      const ul = function (a) { return '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
      const block = function (h, body) { return '<div class="case-body" data-reveal><h2>' + h + '</h2><div>' + body + '</div></div>'; };
      document.title = p.title + ' — Case Study | ISMAIL.STUDIO';
      const md = document.querySelector('meta[name="description"]'); if (md) md.content = p.description;
      detail.innerHTML =
        '<header class="page-hero"><p class="kicker">Case study · Demo project</p><h1 data-hero>' + esc(p.title) + '</h1><p class="lead" data-hero>' + esc(p.description) + '</p></header>' +
        '<div class="case-hero" data-reveal><img src="' + esc(p.image) + '" alt="Hero mockup of the ' + esc(p.title) + ' demo" width="1600" height="1000"></div>' +
        '<dl class="case-meta"><div><dt>Category</dt><dd>' + esc(p.category) + '</dd></div><div><dt>Type</dt><dd>Demonstration project</dd></div><div><dt>Technologies</dt><dd>' + p.technologies.map(esc).join(', ') + '</dd></div>' +
        '<div><dt>Live website</dt><dd>' + (p.liveUrl ? '<a class="link" href="' + esc(p.liveUrl) + '" target="_blank" rel="noopener noreferrer">Open live demo ↗</a>' : 'Demo coming soon') + '</dd></div></dl>' +
        block('Overview', '<p class="lead">' + esc(d.overview) + '</p>') +
        block('Objectives', ul(d.objectives)) + block('Design approach', ul(d.design)) + block('Development process', ul(d.development)) +
        block('Technologies used', '<ul class="tags">' + p.technologies.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>') +
        '<div class="shots">' + d.gallery.map(function (g, k) { return '<img data-reveal src="' + esc(g) + '" alt="' + esc(p.title) + ' screen ' + (k + 2) + '" width="1600" height="1000" loading="lazy">'; }).join('') + '</div>' +
        '<nav class="pager" aria-label="Project navigation"><a href="project-details.html?id=' + encodeURIComponent(prev.id) + '"><small>← Previous project</small><strong>' + esc(prev.title) + '</strong></a><a href="project-details.html?id=' + encodeURIComponent(next.id) + '"><small>Next project →</small><strong>' + esc(next.title) + '</strong></a></nav>';
      // animated gradient behind the case-study hero (same look as the other pages; full-width bleed)
      if (window.AnimatedGradient) AnimatedGradient.init(detail.querySelector('.page-hero'), {
        startingGap: 75, breathing: true, className: 'ag-bleed ag-fade-bottom',
        colors: ['rgba(8,8,11,0)', 'rgba(30,20,80,.28)', 'rgba(76,47,168,.45)', 'rgba(139,92,246,.55)'], stops: [30, 55, 78, 100]
      });
    }
  }
})();
