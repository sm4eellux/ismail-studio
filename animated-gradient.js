/* animated-gradient.js — animated radial-gradient background with an optional "breathing" effect.
   Vanilla JS port of the React component AnimatedGradientBackground (framer-motion removed:
   the 2s entrance animation is plain CSS, see css/animated-gradient.css).

   USAGE (no code needed): add data-animated-gradient to any positioned container.
     <section class="hero" data-animated-gradient data-breathing="true">…content…</section>
   The gradient is inserted as the first child behind your content (give your content position:relative; z-index:1).

   OPTIONS (data-* attributes, all optional — defaults match the original component):
     data-starting-gap="125"      starting width of the radial gradient (%)
     data-breathing="false"       true = gradient slowly expands/contracts
     data-colors="#0A0A0A,#2979FF,..."   comma-separated (rgba(…) colours allowed)
     data-stops="35,50,60,70,80,90,100"   one percentage per colour
     data-speed="0.02"            breathing speed (lower = slower)
     data-range="5"               breathing range in percentage points
     data-top-offset="0"          extra height vs width (flexible vertical control)
     data-class=""                extra class names for the layer

   From JS: AnimatedGradient.init(element, { startingGap, breathing, colors, stops, speed, range, topOffset, className }) */
(function () {
  'use strict';
  var DEFAULTS = {
    startingGap: 125,
    breathing: false,
    colors: ['#0A0A0A', '#2979FF', '#FF80AB', '#FF6D00', '#FFD600', '#00E676', '#3D5AFE'],
    stops: [35, 50, 60, 70, 80, 90, 100],
    speed: 0.02,
    range: 5,
    topOffset: 0,
    className: ''
  };

  function list(v, num) {
    if (v == null || v === '') return null;
    // split on commas that are NOT inside parentheses, so rgba(8,8,11,.5) stays one colour
    var a = String(v).split(/,(?![^(]*\))/).map(function (s) { return s.trim(); }).filter(Boolean);
    return num ? a.map(Number) : a;
  }
  function fromData(el) {
    var d = el.dataset, o = {};
    if (d.startingGap) o.startingGap = parseFloat(d.startingGap);
    if (d.breathing) o.breathing = d.breathing === 'true';
    if (d.colors) o.colors = list(d.colors);
    if (d.stops) o.stops = list(d.stops, true);
    if (d.speed) o.speed = parseFloat(d.speed);
    if (d.range) o.range = parseFloat(d.range);
    if (d.topOffset) o.topOffset = parseFloat(d.topOffset);
    if (d.class) o.className = d.class;
    return o;
  }

  function init(host, options) {
    if (!host || host.__ag) return host && host.__ag;
    var o = Object.assign({}, DEFAULTS, fromData(host), options || {});
    if (o.colors.length !== o.stops.length) {
      console.error('AnimatedGradient: colors (' + o.colors.length + ') and stops (' + o.stops.length + ') must have the same length.');
      return null;
    }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var wrap = document.createElement('div');
    wrap.className = 'ag-bg' + (reduce ? ' ag-static' : '') + (o.className ? ' ' + o.className : '');
    wrap.setAttribute('aria-hidden', 'true');
    var layer = document.createElement('div');
    layer.className = 'ag-layer';
    wrap.appendChild(layer);
    host.insertBefore(wrap, host.firstChild);

    var stopsStr = o.stops.map(function (s, i) { return o.colors[i] + ' ' + s + '%'; }).join(', ');
    function paint(w) {
      layer.style.background = 'radial-gradient(' + w + '% ' + (w + o.topOffset) + '% at 50% 20%, ' + stopsStr + ')';
    }

    var width = o.startingGap, dir = 1, raf = 0, visible = true;
    paint(width);

    function tick() {
      if (width >= o.startingGap + o.range) dir = -1;
      if (width <= o.startingGap - o.range) dir = 1;
      width += dir * o.speed;
      paint(width);
      raf = visible ? requestAnimationFrame(tick) : 0;
    }
    function start() { if (!raf && o.breathing && !reduce) raf = requestAnimationFrame(tick); }

    if (o.breathing && !reduce) {
      start();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); }).observe(host);
      }
      document.addEventListener('visibilitychange', function () {
        visible = document.visibilityState === 'visible'; if (visible) start();
      });
    }

    var api = { element: wrap, destroy: function () { visible = false; cancelAnimationFrame(raf); wrap.remove(); host.__ag = null; } };
    host.__ag = api;
    return api;
  }

  window.AnimatedGradient = { init: init, defaults: DEFAULTS };
  function auto() { document.querySelectorAll('[data-animated-gradient]').forEach(function (el) { init(el); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
