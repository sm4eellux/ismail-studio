/* murmuration.js — thousands of starlings that roll like a real murmuration, converge into a word or
   phrase, hold it, and scatter again. The pointer is a hawk the flock tears open around.
   Vanilla JS port of the React component MurmurationWordmark (React removed; sky and reeds dropped so the
   flock flies over your own page background; phrases are word-wrapped to fill the box).

   USAGE: give a container a definite height and add data-murmuration.
     <div style="height:420px" data-murmuration data-text="Your headline here"> <h1>…</h1> </div>

   OPTIONS (data-* attributes, all optional):
     data-text      word / phrase the flock forms        data-birds   max birds (default 7000)
     data-fly-for   seconds flying free (default 3.5)    data-hold-for seconds the text holds (default 7)
     data-ink       near birds colour (#ECEAF4)          data-ink-far far birds colour (#A78BFA)
     data-weight    font weight (700)                    data-align    left | center (left)
     data-interactive="false"  turn the hawk off
   From JS: var m = Murmuration.init(el, {text:'hi'}); m.destroy(); */
(function () {
  'use strict';

  var DEFAULTS = { text: 'flock', birds: 7000, flyFor: 3.5, holdFor: 7, ink: '#ECEAF4', inkFar: '#A78BFA',
    weight: 700, align: 'left', interactive: true };

  function mmwRandom(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Divergence-free current (curl of travelling waves): folds the flock, never piles birds up.
  function mmwCurl(x, y, t) {
    var a = 1.7 * x + t, b = 1.3 * y - 0.6 * t, c = 2.9 * y + 1.1 * x - 0.8 * t, d = 4.3 * x - 3.7 * y + 1.3 * t;
    var dpdx = 1.7 * Math.cos(a) * Math.cos(b) + 0.6 * 1.1 * Math.cos(c) - 0.35 * 4.3 * Math.sin(d);
    var dpdy = -1.3 * Math.sin(a) * Math.sin(b) + 0.6 * 2.9 * Math.cos(c) + 0.35 * 3.7 * Math.sin(d);
    return [dpdy, -dpdx];
  }
  function mmwCentre(t) {
    return [0.42 * Math.sin(t * 0.21) + 0.12 * Math.sin(t * 0.53 + 1), 0.16 * Math.sin(t * 0.33 + 2) - 0.08];
  }
  function mmwEase(k) { var x = k < 0 ? 0 : k > 1 ? 1 : k; return x * x * (3 - 2 * x); }
  // Pair every bird with a (shuffled) target point so the text fills in from everywhere at once.
  function mmwAssign(birds, points, seed) {
    var out = new Int32Array(birds);
    if (points <= 0) { out.fill(-1); return out; }
    var order = new Int32Array(points), i, r = mmwRandom(seed);
    for (i = 0; i < points; i++) order[i] = i;
    for (i = points - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
    for (i = 0; i < birds; i++) out[i] = order[i % points];
    return out;
  }

  function parse(host) {
    var d = host.dataset, o = {};
    if (d.text) o.text = d.text;
    if (d.birds) o.birds = parseFloat(d.birds);
    if (d.flyFor) o.flyFor = parseFloat(d.flyFor);
    if (d.holdFor) o.holdFor = parseFloat(d.holdFor);
    if (d.ink) o.ink = d.ink;
    if (d.inkFar) o.inkFar = d.inkFar;
    if (d.weight) o.weight = parseFloat(d.weight);
    if (d.align) o.align = d.align;
    if (d.interactive === 'false') o.interactive = false;
    return o;
  }

  function init(host, opts) {
    if (host.__mmw) host.__mmw.destroy();
    var o = Object.assign({}, DEFAULTS, parse(host), opts || {});
    var canvas = document.createElement('canvas');
    canvas.className = 'mmw-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.classList.add('mmw-host');
    host.insertBefore(canvas, host.firstChild);
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var w = 1, h = 1, dpr = 1, n = 0, raf = 0, visible = true, alive = true;
    var px = new Float32Array(0), py = new Float32Array(0), vx = new Float32Array(0), vy = new Float32Array(0);
    var depth = new Float32Array(0), phase = new Float32Array(0), target = new Int32Array(0);
    var tx = new Float32Array(0), ty = new Float32Array(0);
    var hx = -1e5, hy = -1e5, last = performance.now(), clock = Math.max(0, o.flyFor - 1);
    var rnd = mmwRandom(11);

    function fontFamily() { return window.getComputedStyle(host.querySelector('h1') || host).fontFamily; }

    function sample() {
      var m = document.createElement('canvas');
      m.width = w; m.height = h;
      var mc = m.getContext('2d', { willReadFrequently: true });
      var pts = [], family = fontFamily(), text = (o.text || ' ').trim() || ' ';
      var left = o.align === 'left', boxW = w * (left ? 0.98 : 0.9), boxH = h * 0.92, LH = 1.04;
      var words = text.split(/\s+/);
      function font(px) { return o.weight + ' ' + px + 'px ' + family; }
      function wrap(px) {
        mc.font = font(px);
        var out = [], cur = '';
        for (var k = 0; k < words.length; k++) {
          var test = cur ? cur + ' ' + words[k] : words[k];
          if (cur && mc.measureText(test).width > boxW) { out.push(cur); cur = words[k]; } else cur = test;
        }
        if (cur) out.push(cur);
        return out;
      }
      // largest font size whose wrapped lines fit both the width and the height
      var lo = 2, hi = Math.max(h, 4);
      while (hi - lo > 0.5) {
        var mid = (lo + hi) / 2, ls = wrap(mid), ok = ls.length * mid * LH <= boxH;
        if (ok) for (var k = 0; k < ls.length; k++) { if (mc.measureText(ls[k]).width > boxW) { ok = false; break; } }
        if (ok) lo = mid; else hi = mid;
      }
      var lines = wrap(lo);
      mc.font = font(lo);
      mc.fillStyle = '#fff';
      mc.textAlign = left ? 'left' : 'center';
      mc.textBaseline = 'middle';
      var x0 = left ? w * 0.01 : w / 2, y0 = h / 2 - ((lines.length - 1) * lo * LH) / 2;
      for (var i = 0; i < lines.length; i++) mc.fillText(lines[i], x0, y0 + i * lo * LH);
      var img = mc.getImageData(0, 0, w, h).data;
      var step = Math.max(2, Math.round(Math.sqrt((w * h) / 90000)));
      for (var y = 0; y < h; y += step) for (var x = 0; x < w; x += step) {
        if (img[(y * w + x) * 4 + 3] > 128) pts.push(x + (rnd() - 0.5) * step, y + (rnd() - 0.5) * step);
      }
      var count = pts.length / 2;
      tx = new Float32Array(count); ty = new Float32Array(count);
      for (var p = 0; p < count; p++) { tx[p] = pts[p * 2]; ty[p] = pts[p * 2 + 1]; }
      return count * step * step; // ink area in px²
    }

    function layout() {
      var rect = host.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width)); h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      var ink = sample();
      // one bird per ~30px² of letter, so the text stays legible at any size
      var want = Math.max(500, Math.min(Math.round(ink / 30), Math.max(600, Math.min(9000, o.birds))));
      if (want !== n) {
        n = want;
        px = new Float32Array(n); py = new Float32Array(n); vx = new Float32Array(n); vy = new Float32Array(n);
        depth = new Float32Array(n); phase = new Float32Array(n);
        for (var i = 0; i < n; i++) {
          var a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
          px[i] = w * 0.5 + Math.cos(a) * r * w * 0.22; py[i] = h * 0.4 + Math.sin(a) * r * h * 0.16;
          depth[i] = 0.55 + rnd() * 0.45; phase[i] = rnd() * Math.PI * 2;
        }
      }
      target = mmwAssign(n, tx.length, 23);
      if (reduced) { // motion reduced: birds rest on the text, drawn once
        for (var j = 0; j < n; j++) { var ti = target[j]; if (ti >= 0) { px[j] = tx[ti]; py[j] = ty[ti]; } vx[j] = 1; vy[j] = 0; }
        draw(1);
      }
    }

    function draw(pull) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (var pass = 0; pass < 2; pass++) { // two depth passes: near birds read brighter and heavier
        ctx.beginPath();
        for (var i = 0; i < n; i++) {
          var near = depth[i] > 0.78;
          if ((pass === 1) !== near) continue;
          var s = (1.6 + depth[i] * 2.2) * (1 - 0.35 * pull), sp = Math.hypot(vx[i], vy[i]) + 0.001;
          var dx = vx[i] / sp, dy = vy[i] / sp, flap = 0.55 + 0.45 * Math.sin(phase[i]);
          var bx = px[i], by = py[i], wx = -dx * s, wy = -dy * s, nx = -dy * s * flap, ny = dx * s * flap;
          ctx.moveTo(bx + wx + nx, by + wy + ny); ctx.lineTo(bx, by); ctx.lineTo(bx + wx - nx, by + wy - ny);
        }
        ctx.strokeStyle = pass === 0 ? o.inkFar : o.ink;
        ctx.globalAlpha = pass === 0 ? 0.6 : 0.95;
        ctx.lineWidth = pass === 0 ? 0.9 : 1.25;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.visibilityState !== 'visible') { last = now; return; }
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now; clock += dt;
      var fly = Math.max(1, o.flyFor), hold = Math.max(0.5, o.holdFor);
      var tc = clock % (fly + 2.4 + hold + 0.6), pull = 0;
      if (tc > fly && tc <= fly + 2.4) pull = mmwEase((tc - fly) / 2.4);
      else if (tc > fly + 2.4 && tc <= fly + 2.4 + hold) pull = 1;
      else if (tc > fly + 2.4 + hold) pull = 1 - mmwEase((tc - fly - 2.4 - hold) / 0.6);

      var u = Math.min(w, h), cen = mmwCentre(clock);
      var cxp = w / 2 + cen[0] * w * 0.5, cyp = h * 0.42 + cen[1] * h, t = clock * 0.35;
      var hawk = o.interactive && hx > -1e4, hawkR = u * 0.16, free = 1 - pull;
      for (var i = 0; i < n; i++) {
        var x = px[i], y = py[i], ax = 0, ay = 0;
        var cv = mmwCurl(((x - w / 2) / u) * 2.2 + depth[i] * 0.25, ((y - h / 2) / u) * 2.2, t);
        ax += cv[0] * 420 * free; ay += cv[1] * 420 * free;
        var dxC = cxp - x, dyC = (cyp - y) * 1.6, dC = Math.hypot(dxC, dyC) / u;
        var holdK = dC < 0.14 ? 0.15 : 0.15 + (dC - 0.14) * 6;
        ax += dxC * holdK * 2.2 * free; ay += dyC * holdK * 1.6 * free;
        var ti = target[i];
        if (pull > 0 && ti >= 0) {
          ax += (tx[ti] - x) * 9 * pull - vx[i] * 3.2 * pull;
          ay += (ty[ti] - y) * 9 * pull - vy[i] * 3.2 * pull;
        }
        if (hawk) {
          var ddx = x - hx, ddy = y - hy, d2 = ddx * ddx + ddy * ddy;
          if (d2 < hawkR * hawkR) {
            var d = Math.sqrt(d2) + 0.01, f = (1 - d / hawkR) * 5200;
            ax += (ddx / d) * f; ay += (ddy / d) * f;
          }
        }
        var nvx = (vx[i] + ax * dt) * (1 - 1.1 * dt), nvy = (vy[i] + ay * dt) * (1 - 1.1 * dt);
        var sp = Math.hypot(nvx, nvy), cap = 520 + 380 * pull;
        if (sp > cap) { nvx = (nvx / sp) * cap; nvy = (nvy / sp) * cap; }
        vx[i] = nvx; vy[i] = nvy; px[i] = x + nvx * dt; py[i] = y + nvy * dt;
        phase[i] += dt * (9 + sp * 0.02);
      }
      draw(pull);
    }

    function onMove(e) { var b = canvas.getBoundingClientRect(); hx = e.clientX - b.left; hy = e.clientY - b.top; }
    function onLeave() { hx = -1e5; hy = -1e5; }

    layout();
    if (!reduced) raf = requestAnimationFrame(frame);
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(host);
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (e) { visible = e[0] ? e[0].isIntersecting : true; }) : null;
    if (io) io.observe(host);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (alive) layout(); }).catch(function () {});

    var api = {
      destroy: function () {
        alive = false; cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); if (io) io.disconnect();
        host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave);
        canvas.remove(); host.__mmw = null;
      }
    };
    host.__mmw = api;
    return api;
  }

  function auto() { document.querySelectorAll('[data-murmuration]').forEach(function (el) { init(el); }); }
  window.Murmuration = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
