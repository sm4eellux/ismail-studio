/* pixel-flow-field.js — a canvas grid of tiny pixels that drifts like a flow field, spells a word
   (or an image) through brightness, and is pushed around by the pointer.
   Vanilla JS port of the React component PixelFlowField (React/motion/Tailwind removed; the
   simulation code is unchanged).

   USAGE (no code needed): give any container a height and add data-pixel-flow-field.
     <section style="height:70vh" data-pixel-flow-field data-text="ismail"> …optional content… </section>
   Content inside the container is drawn above the field.

   OPTIONS (data-* attributes, all optional):
     data-text="smooth"         word sampled into the grid (short words read best)
     data-src="img.png"         image sampled instead of the text (must be CORS-readable, else text is used)
     data-shape="square"        square | circle | cross
     data-cell-size="8"         cell size in px      data-gap="3"  gap between cells in px
     data-speed="1"             flow speed multiplier
     data-weight="800"          font weight used for the text
     data-align="center"        center | left (phrases with spaces are word-wrapped to fit the box)
     data-colors="c1,c2,c3"     ramp dim→bright: field, accent, ink. Any CSS colour or var(--token); rgba(…) allowed
     data-pointer-radius="130"  data-pointer-strength="1" (0–1)
     data-paused="true"         freeze the field

   From JS:  var f = PixelFlowField.init(el, {...same options in camelCase...});
             f.scatter()  blow the field apart so it re-forms   f.update({text:'hello'})   f.destroy() */
(function () {
  'use strict';

  var MAX_DPR = 2, RGB_MAX = 255, MS_PER_SECOND = 1000, TAU = Math.PI * 2;
  var DEFAULT_FONT_FAMILY = 'system-ui, sans-serif';
  var DEFAULTS = {
    text: 'smooth', src: '', shape: 'square', cellSize: 8, gap: 3, speed: 1, weight: 800, align: 'center',
    pointerRadius: 130, pointerStrength: 1, paused: false,
    // ramp stops tied to the portfolio tokens (with fallbacks): field, accent, ink
    colors: ['var(--muted, #9A97AB)', 'var(--violet, #8B5CF6)', 'var(--text, #ECEAF4)']
  };
  var FALLBACK_COLORS = [[154, 151, 171, 1], [139, 92, 246, 1], [236, 234, 244, 1]];

  var MIN_STEP = 3, MIN_COLS = 44, MAX_CELLS = 14000, MIN_DRAW = 0.35;
  var TIER_COUNT = 7, RAMP_MID = 0.6, FIELD_ALPHA = 0.24, ACCENT_ALPHA = 0.92, INK_ALPHA = 1;
  var MASK_LOW = 0.08, MASK_HIGH = 0.86;
  var TEXT_HEIGHT_RATIO = 0.68, TEXT_WIDTH_RATIO = 0.86;
  var LUMA_R = 0.2126, LUMA_G = 0.7152, LUMA_B = 0.0722;
  var LATTICE = 4, NOISE_SCALE = 0.19, TIME_SCALE = 0.14, FLOW_TURNS = 1.35;
  var MAG_FLOOR = 0.35, MAG_RANGE = 0.65, NOISE_OFFSET_X = 37.2, NOISE_OFFSET_Y = 11.5, NOISE_COUNTER_FLOW = 0.8;
  var DRIFT_RATIO = 0.95, WORD_CALM = 0.84, SIZE_FLOOR = 0.3, SIZE_MASK = 0.64, SIZE_FLOW = 0.2, STILL_MAG = 0.55, CROSS_THICKNESS = 0.34;
  var REFORM_MS = 1750, STAGGER = 0.45, WORD_LEAD = 0.16, DELAY_X = 0.55, DELAY_Y = 0.3, DELAY_JITTER = 0.15;
  var SCATTER_SIZE = 0.5, SCATTER_SPREAD = 1.25;
  var WAKE_TAU = 0.42, WAKE_GAIN = 3.4, WAKE_CEILING = 2.4, MAX_SUBSTEPS = 4, MAX_DT = 0.05;
  var HASH_X = 127.1, HASH_Y = 311.7, HASH_SEED = 74.7, HASH_MULTIPLIER = 43758.5453123;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function smoothstep(v) { return v * v * (3 - 2 * v); }
  function toCssColor(input) { input = input.trim(); return input.indexOf('--') === 0 ? 'var(' + input + ')' : input; }
  function hash2(x, y) { var v = Math.sin(x * HASH_X + y * HASH_Y + HASH_SEED) * HASH_MULTIPLIER; return v - Math.floor(v); }
  function valueNoise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = smoothstep(fx), uy = smoothstep(fy);
    var a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    var top = a + (b - a) * ux, bottom = c + (d - c) * ux;
    return top + (bottom - top) * uy;
  }

  // Resolves any CSS colour / var() to [r,g,b,a] using the host's computed styles.
  function resolveCssColors(inputs, host) {
    var probe = document.createElement('span');
    probe.style.display = 'none';
    host.appendChild(probe);
    var canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    var context = canvas.getContext('2d', { willReadFrequently: true });
    var out = inputs.map(function (input, index) {
      var fallback = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
      if (!context) return fallback;
      probe.style.color = '';
      probe.style.color = toCssColor(input);
      var computed = window.getComputedStyle(probe).color;
      if (!computed) return fallback;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = '#000000';
      context.fillStyle = computed;
      context.fillRect(0, 0, 1, 1);
      var data = context.getImageData(0, 0, 1, 1).data;
      var alpha = data[3] / RGB_MAX;
      if (alpha === 0) return [data[0], data[1], data[2], 1];
      return [Math.round(data[0] / alpha), Math.round(data[1] / alpha), Math.round(data[2] / alpha), alpha];
    });
    probe.remove();
    return out;
  }

  function mixChannel(from, to, t) { return Math.round(from + (to - from) * t); }
  // Coverage → colour: brightness travels through the ramp's lightness so the word actually reads.
  function rampCss(coverage, colors) {
    var field = colors[0] || FALLBACK_COLORS[0], accent = colors[1] || colors[0] || FALLBACK_COLORS[1], ink = colors[2] || accent;
    var low = coverage <= RAMP_MID;
    var from = low ? field : accent, to = low ? accent : ink;
    var t = low ? coverage / RAMP_MID : (coverage - RAMP_MID) / (1 - RAMP_MID || 1);
    var fromAlpha = low ? FIELD_ALPHA : ACCENT_ALPHA, toAlpha = low ? ACCENT_ALPHA : INK_ALPHA;
    var r = mixChannel(from[0], to[0], t), g = mixChannel(from[1], to[1], t), b = mixChannel(from[2], to[2], t);
    var a = (fromAlpha + (toAlpha - fromAlpha) * t) * (to[3] == null ? 1 : to[3]);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a.toFixed(3) + ')';
  }

  function createFieldController(canvas) {
    var context = canvas.getContext('2d');
    if (!context) return null;
    var sampler = document.createElement('canvas');
    var samplerContext = sampler.getContext('2d', { willReadFrequently: true });

    var settings = {
      cellSize: DEFAULTS.cellSize, colors: FALLBACK_COLORS, fontFamily: DEFAULT_FONT_FAMILY, gap: DEFAULTS.gap,
      pointerRadius: DEFAULTS.pointerRadius, pointerStrength: DEFAULTS.pointerStrength, scatterSeed: 0,
      shape: 'square', source: null, speed: 1, still: false, text: DEFAULTS.text, weight: DEFAULTS.weight, align: DEFAULTS.align
    };
    var width = 1, height = 1, cols = 1, rows = 1, count = 1;
    var step = DEFAULTS.cellSize + DEFAULTS.gap, cellPx = DEFAULTS.cellSize;
    var mask = new Float32Array(1), ampFactor = new Float32Array(1), sizeBase = new Float32Array(1);
    var homeX = new Float32Array(1), homeY = new Float32Array(1), scatterX = new Float32Array(1), scatterY = new Float32Array(1);
    var wakeX = new Float32Array(1), wakeY = new Float32Array(1), delay = new Float32Array(1);
    var latticeIndex = new Int32Array(1), latticeWx = new Float32Array(1), latticeWy = new Float32Array(1);
    var latCols = 2, latRows = 2, fieldU = new Float32Array(4), fieldV = new Float32Array(4);
    var tiers = [], tierCss = [], sampleKey = '';
    var pointerX = 0, pointerY = 0, previousPointerX = 0, previousPointerY = 0, pointerActive = false;
    var startedAt = performance.now(), lastFrameAt = startedAt, scatterAt = startedAt;
    var hasStarted = false, frame = 0, running = false, destroyed = false;

    function allocate() {
      mask = new Float32Array(count); ampFactor = new Float32Array(count); sizeBase = new Float32Array(count);
      homeX = new Float32Array(count); homeY = new Float32Array(count);
      scatterX = new Float32Array(count); scatterY = new Float32Array(count);
      wakeX = new Float32Array(count); wakeY = new Float32Array(count); delay = new Float32Array(count);
      latticeIndex = new Int32Array(count); latticeWx = new Float32Array(count); latticeWy = new Float32Array(count);
    }

    // Rasterises the source once into a cols×rows bitmap (one pixel per cell). Only on grid/source change.
    function sampleSource() {
      if (!samplerContext) { mask.fill(0); return; }
      sampler.width = cols; sampler.height = rows;
      samplerContext.clearRect(0, 0, cols, rows);
      var source = settings.source, text = settings.text, drewSource = false;
      if (source && source.naturalWidth > 0) {
        var scale = Math.min(cols / source.naturalWidth, rows / source.naturalHeight);
        var dw = source.naturalWidth * scale, dh = source.naturalHeight * scale;
        try { samplerContext.drawImage(source, (cols - dw) / 2, (rows - dh) / 2, dw, dh); drewSource = true; }
        catch (e) { drewSource = false; }
      }
      if (!drewSource && text.length > 0) {
        var fontSize = Math.max(rows * TEXT_HEIGHT_RATIO, 1);
        var maxWidth = cols * TEXT_WIDTH_RATIO;
        var fontOf = function (px) { return settings.weight + ' ' + px + 'px ' + settings.fontFamily; };
        samplerContext.fillStyle = '#ffffff';
        samplerContext.textBaseline = 'middle';
        if (text.indexOf(' ') === -1) {
          // single word: one line, shrunk to fit the width
          samplerContext.font = fontOf(fontSize);
          var measured = samplerContext.measureText(text).width;
          if (measured > maxWidth && measured > 0) { fontSize = Math.max((fontSize * maxWidth) / measured, 1); samplerContext.font = fontOf(fontSize); }
          samplerContext.textAlign = 'center';
          samplerContext.fillText(text, cols / 2, rows / 2);
        } else {
          // phrase: word-wrap, using the largest font size whose lines fit both width and height
          var left = settings.align === 'left';
          var boxW = left ? cols * 0.98 : maxWidth, boxH = rows * 0.92, LINE_H = 1.04;
          var words = text.split(/\s+/), lines = [];
          var wrap = function (px) {
            samplerContext.font = fontOf(px);
            var out = [], cur = '';
            for (var w = 0; w < words.length; w++) {
              var test = cur ? cur + ' ' + words[w] : words[w];
              if (cur && samplerContext.measureText(test).width > boxW) { out.push(cur); cur = words[w]; } else cur = test;
            }
            if (cur) out.push(cur);
            return out;
          };
          var lo = 2, hi = Math.max(rows, 4);
          while (hi - lo > 0.5) {
            var mid = (lo + hi) / 2, ls = wrap(mid), ok = ls.length * mid * LINE_H <= boxH;
            if (ok) for (var k = 0; k < ls.length; k++) { if (samplerContext.measureText(ls[k]).width > boxW) { ok = false; break; } }
            if (ok) lo = mid; else hi = mid;
          }
          fontSize = lo; lines = wrap(fontSize);
          samplerContext.font = fontOf(fontSize);
          samplerContext.textAlign = left ? 'left' : 'center';
          var x = left ? cols * 0.01 : cols / 2, y0 = rows / 2 - ((lines.length - 1) * fontSize * LINE_H) / 2;
          for (var n = 0; n < lines.length; n++) samplerContext.fillText(lines[n], x, y0 + n * fontSize * LINE_H);
        }
      }
      var pixels = null;
      try { pixels = samplerContext.getImageData(0, 0, cols, rows).data; } catch (e) { pixels = null; } // tainted canvas
      if (!pixels) { mask.fill(0); return; }
      var span = MASK_HIGH - MASK_LOW || 1;
      for (var i = 0; i < count; i++) {
        var p = i * 4;
        var luma = (pixels[p] * LUMA_R + pixels[p + 1] * LUMA_G + pixels[p + 2] * LUMA_B) / RGB_MAX;
        var coverage = (luma * pixels[p + 3]) / RGB_MAX;
        mask[i] = smoothstep(clamp((coverage - MASK_LOW) / span, 0, 1));
      }
    }

    function buildDerived() {
      for (var row = 0; row < rows; row++) {
        var ny = rows > 1 ? row / (rows - 1) : 0, latY = row / LATTICE, iy = Math.floor(latY), wy = latY - iy;
        for (var col = 0; col < cols; col++) {
          var i = row * cols + col, nx = cols > 1 ? col / (cols - 1) : 0, m = mask[i];
          homeX[i] = (col + 0.5) * step; homeY[i] = (row + 0.5) * step;
          ampFactor[i] = 1 - m * WORD_CALM;
          sizeBase[i] = SIZE_FLOOR + SIZE_MASK * m;
          delay[i] = clamp(nx * DELAY_X + ny * DELAY_Y + hash2(col, row) * DELAY_JITTER - m * WORD_LEAD, 0, 1);
          var latX = col / LATTICE, ix = Math.floor(latX);
          latticeIndex[i] = iy * latCols + ix; latticeWx[i] = latX - ix; latticeWy[i] = wy;
        }
      }
    }
    function buildScatter(seed) {
      var offset = (SCATTER_SPREAD - 1) / 2;
      for (var i = 0; i < count; i++) {
        var a = hash2(i + 1, seed * 1.7 + 3.1), b = hash2(seed * 2.3 + 7.7, i + 1);
        scatterX[i] = (a * SCATTER_SPREAD - offset) * width;
        scatterY[i] = (b * SCATTER_SPREAD - offset) * height;
      }
    }
    function buildTiers() {
      var buckets = [], t;
      for (t = 0; t < TIER_COUNT; t++) buckets.push([]);
      for (var i = 0; i < count; i++) buckets[Math.min(TIER_COUNT - 1, Math.floor(mask[i] * TIER_COUNT))].push(i);
      tiers = buckets.map(function (b) { return Int32Array.from(b); });
      tierCss = buckets.map(function (_, tier) { return rampCss((tier + 0.5) / TIER_COUNT, settings.colors); });
    }

    function buildGrid() {
      step = Math.max(settings.cellSize + settings.gap, MIN_STEP);
      cellPx = settings.cellSize;
      cols = Math.max(1, Math.ceil(width / step)); rows = Math.max(1, Math.ceil(height / step));
      // On a narrow surface the grid densifies so the word stays legible.
      var legibleStep = Math.max(width / MIN_COLS, MIN_STEP);
      if (width >= MIN_COLS && legibleStep < step) {
        cellPx *= legibleStep / step; step = legibleStep;
        cols = Math.max(1, Math.ceil(width / step)); rows = Math.max(1, Math.ceil(height / step));
      }
      // A very dense grid over a big surface is coarsened (not truncated) to protect the frame budget.
      if (cols * rows > MAX_CELLS) {
        var s = Math.sqrt((cols * rows) / MAX_CELLS);
        step *= s; cellPx *= s;
        cols = Math.max(1, Math.ceil(width / step)); rows = Math.max(1, Math.ceil(height / step));
      }
      var nextCount = cols * rows, resized = nextCount !== count;
      count = nextCount;
      latCols = Math.ceil(cols / LATTICE) + 2; latRows = Math.ceil(rows / LATTICE) + 2;
      if (resized) { allocate(); }
      if (resized || fieldU.length !== latCols * latRows) { fieldU = new Float32Array(latCols * latRows); fieldV = new Float32Array(latCols * latRows); }
      var key = [cols, rows, settings.text, settings.weight, settings.align, settings.fontFamily, settings.source ? settings.source.src : ''].join('|');
      if (key !== sampleKey) { sampleKey = key; sampleSource(); }
      buildDerived(); buildScatter(settings.scatterSeed); buildTiers();
    }

    function resize() {
      var rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      var pw = Math.max(1, Math.round(width * dpr)), ph = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid();
    }

    function traceCell(cx, cy, size) {
      var half = size / 2;
      if (settings.shape === 'circle') { context.moveTo(cx + half, cy); context.arc(cx, cy, half, 0, TAU); return; }
      if (settings.shape === 'cross') {
        var arm = size * CROSS_THICKNESS;
        context.rect(cx - half, cy - arm / 2, size, arm);
        context.rect(cx - arm / 2, cy - half, arm, size);
        return;
      }
      context.rect(cx - half, cy - half, size, size);
    }

    function updateFlowField(time) {
      for (var ly = 0; ly < latRows; ly++) {
        var gy = ly * LATTICE * NOISE_SCALE, base = ly * latCols;
        for (var lx = 0; lx < latCols; lx++) {
          var gx = lx * LATTICE * NOISE_SCALE;
          var swirl = valueNoise(gx, gy + time);
          var strength = valueNoise(gx + NOISE_OFFSET_X, gy - time * NOISE_COUNTER_FLOW + NOISE_OFFSET_Y);
          var angle = swirl * TAU * FLOW_TURNS, magnitude = MAG_FLOOR + MAG_RANGE * strength;
          fieldU[base + lx] = Math.cos(angle) * magnitude;
          fieldV[base + lx] = Math.sin(angle) * magnitude;
        }
      }
    }

    function stampWake(px, py, dt) {
      var radius = Math.max(settings.pointerRadius, 1), limit = radius * radius, ceiling = step * WAKE_CEILING;
      var firstCol = clamp(Math.floor((px - radius) / step), 0, cols - 1), lastCol = clamp(Math.ceil((px + radius) / step), 0, cols - 1);
      var firstRow = clamp(Math.floor((py - radius) / step), 0, rows - 1), lastRow = clamp(Math.ceil((py + radius) / step), 0, rows - 1);
      for (var row = firstRow; row <= lastRow; row++) {
        var base = row * cols;
        for (var col = firstCol; col <= lastCol; col++) {
          var i = base + col, dx = homeX[i] - px, dy = homeY[i] - py, squared = dx * dx + dy * dy;
          if (squared >= limit || squared === 0) continue;
          var distance = Math.sqrt(squared), falloff = 1 - distance / radius;
          var push = falloff * falloff * settings.pointerStrength * radius * WAKE_GAIN * dt;
          wakeX[i] = clamp(wakeX[i] + (dx / distance) * push, -ceiling, ceiling);
          wakeY[i] = clamp(wakeY[i] + (dy / distance) * push, -ceiling, ceiling);
        }
      }
    }
    // Walks the segment the pointer covered since last frame so a fast flick leaves a continuous trail.
    function advanceWake(dt) {
      if (!pointerActive) { previousPointerX = pointerX; previousPointerY = pointerY; return; }
      var dx = pointerX - previousPointerX, dy = pointerY - previousPointerY, travel = Math.hypot(dx, dy);
      var steps = clamp(Math.ceil(travel / step), 1, MAX_SUBSTEPS), slice = dt / steps;
      for (var s = 1; s <= steps; s++) { var t = s / steps; stampWake(previousPointerX + dx * t, previousPointerY + dy * t, slice); }
      previousPointerX = pointerX; previousPointerY = pointerY;
    }

    // The single frame drawn when motion is reduced: grid at rest, word legible.
    function drawResolved() {
      for (var tier = 0; tier < tiers.length; tier++) {
        var bucket = tiers[tier];
        if (bucket.length === 0) continue;
        context.fillStyle = tierCss[tier];
        context.beginPath();
        for (var k = 0; k < bucket.length; k++) {
          var i = bucket[k], size = cellPx * (sizeBase[i] + SIZE_FLOW * STILL_MAG);
          if (size > MIN_DRAW) traceCell(homeX[i], homeY[i], size);
        }
        context.fill();
      }
    }

    function drawFlowing(reform, decay) {
      var settled = reform >= 1, rest = 1 / (1 - STAGGER), drift = step * DRIFT_RATIO;
      for (var tier = 0; tier < tiers.length; tier++) {
        var bucket = tiers[tier];
        if (bucket.length === 0) continue;
        context.fillStyle = tierCss[tier];
        context.beginPath();
        for (var k = 0; k < bucket.length; k++) {
          var i = bucket[k];
          var wx = wakeX[i] * decay, wy = wakeY[i] * decay;
          wakeX[i] = wx; wakeY[i] = wy;
          var corner = latticeIndex[i], tx = latticeWx[i], ty = latticeWy[i], below = corner + latCols;
          var uTop = fieldU[corner] + (fieldU[corner + 1] - fieldU[corner]) * tx;
          var uBottom = fieldU[below] + (fieldU[below + 1] - fieldU[below]) * tx;
          var vTop = fieldV[corner] + (fieldV[corner + 1] - fieldV[corner]) * tx;
          var vBottom = fieldV[below] + (fieldV[below + 1] - fieldV[below]) * tx;
          var u = uTop + (uBottom - uTop) * ty, v = vTop + (vBottom - vTop) * ty;
          var magnitude = Math.abs(u) + Math.abs(v);
          var amplitude = drift * ampFactor[i];
          var restX = homeX[i] + u * amplitude + wx, restY = homeY[i] + v * amplitude + wy;
          var x = restX, y = restY, scale = 1;
          if (!settled) {
            var local = clamp((reform - delay[i] * STAGGER) * rest, 0, 1), inverse = 1 - local;
            var eased = 1 - inverse * inverse * inverse; // ease-out cubic
            x = scatterX[i] + (restX - scatterX[i]) * eased;
            y = scatterY[i] + (restY - scatterY[i]) * eased;
            scale = SCATTER_SIZE + (1 - SCATTER_SIZE) * eased;
          }
          var size = cellPx * (sizeBase[i] + SIZE_FLOW * magnitude) * scale;
          if (size <= MIN_DRAW) continue;
          if (x < -size || x > width + size || y < -size || y > height + size) continue;
          traceCell(x, y, size);
        }
        context.fill();
      }
    }

    function draw() {
      if (destroyed) return;
      context.clearRect(0, 0, width, height);
      if (settings.still) { drawResolved(); return; }
      var now = performance.now(), dt = clamp((now - lastFrameAt) / MS_PER_SECOND, 0, MAX_DT);
      lastFrameAt = now;
      updateFlowField(((now - startedAt) / MS_PER_SECOND) * settings.speed * TIME_SCALE);
      advanceWake(dt);
      drawFlowing(clamp((now - scatterAt) / REFORM_MS, 0, 1), Math.exp(-dt / WAKE_TAU));
    }
    function tick() { if (destroyed || !running) return; draw(); frame = requestAnimationFrame(tick); }

    resize();
    return {
      destroy: function () {
        destroyed = true; running = false; cancelAnimationFrame(frame);
        context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0; canvas.height = 0; sampler.width = 0; sampler.height = 0;
      },
      render: function () { resize(); draw(); },
      resize: function () { resize(); if (!running) draw(); },
      setPointer: function (x, y, active) {
        if (!pointerActive) { previousPointerX = x; previousPointerY = y; }
        pointerX = x; pointerY = y; pointerActive = active;
      },
      setRunning: function (next) {
        if (destroyed || running === next) return;
        running = next;
        if (next) {
          lastFrameAt = performance.now();
          if (!hasStarted) { hasStarted = true; scatterAt = lastFrameAt; } // reveal plays when first visible
          frame = requestAnimationFrame(tick);
        } else cancelAnimationFrame(frame);
      },
      setSettings: function (next) {
        var rescatter = next.scatterSeed !== settings.scatterSeed;
        settings = next; buildGrid();
        if (rescatter) { scatterAt = performance.now(); wakeX.fill(0); wakeY.fill(0); }
      }
    };
  }

  /* ---------- wiring (replaces the React component) ---------- */
  function splitList(v) { // commas inside parentheses (rgba(...)) do not split
    return String(v).split(/,(?![^(]*\))/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function fromData(el) {
    var d = el.dataset, o = {};
    if (d.text != null) o.text = d.text;
    if (d.src) o.src = d.src;
    if (d.shape) o.shape = d.shape;
    if (d.cellSize) o.cellSize = parseFloat(d.cellSize);
    if (d.gap) o.gap = parseFloat(d.gap);
    if (d.speed) o.speed = parseFloat(d.speed);
    if (d.weight) o.weight = parseFloat(d.weight);
    if (d.align) o.align = d.align;
    if (d.pointerRadius) o.pointerRadius = parseFloat(d.pointerRadius);
    if (d.pointerStrength) o.pointerStrength = parseFloat(d.pointerStrength);
    if (d.paused) o.paused = d.paused === 'true';
    if (d.colors) o.colors = splitList(d.colors);
    return o;
  }

  function init(host, options) {
    if (!host) return null;
    if (host.__pff) return host.__pff;
    var o = Object.assign({}, DEFAULTS, fromData(host), options || {});
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    host.classList.add('pff-host');
    var layer = document.createElement('div');
    layer.className = 'pff-layer';
    layer.setAttribute('aria-hidden', 'true');
    var canvas = document.createElement('canvas');
    layer.appendChild(canvas);
    host.insertBefore(layer, host.firstChild);

    var ctrl = createFieldController(canvas);
    if (!ctrl) { // no canvas support: static dotted grid
      canvas.remove();
      layer.classList.add('pff-fallback');
      var s = Math.max(o.cellSize + o.gap, MIN_STEP);
      layer.style.backgroundImage = 'radial-gradient(' + toCssColor(o.colors[1] || o.colors[0]) + ' 1px, transparent 1px)';
      layer.style.backgroundSize = s + 'px ' + s + 'px';
      return null;
    }

    var colors = resolveCssColors(o.colors, host), fontFamily = DEFAULT_FONT_FAMILY, source = null;
    var onScreen = true, active = false, seed = 0, destroyed = false;

    function apply() {
      if (destroyed) return;
      ctrl.setSettings({
        cellSize: Math.max(o.cellSize, MIN_STEP), colors: colors, fontFamily: fontFamily, gap: Math.max(o.gap, 0),
        pointerRadius: Math.max(o.pointerRadius, 1), pointerStrength: clamp(o.pointerStrength, 0, 1),
        scatterSeed: seed, shape: o.shape, source: source, speed: Math.max(o.speed, 0),
        still: reduce, text: o.text, weight: o.weight, align: o.align
      });
      ctrl.render();
    }
    function sync() {
      active = onScreen && document.visibilityState === 'visible';
      var run = active && !o.paused && !reduce;
      ctrl.setRunning(run);
      if (!run) ctrl.render();
    }
    function loadSource() {
      source = null;
      if (!o.src) return;
      var image = new Image(), want = o.src;
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = function () { if (!destroyed && want === o.src) { source = image; apply(); } };
      image.onerror = function () { if (!destroyed && want === o.src) { source = null; apply(); } };
      image.src = o.src;
    }

    // The sampled word uses the typeface of the surrounding page.
    function readFont() { if (!destroyed) { fontFamily = window.getComputedStyle(host).fontFamily; apply(); } }
    fontFamily = window.getComputedStyle(host).fontFamily;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(readFont).catch(function () {});

    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { ctrl.resize(); }) : null;
    if (ro) ro.observe(canvas);
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (e) {
      onScreen = e.some(function (x) { return x.isIntersecting; }); sync();
    }) : null;
    if (io) io.observe(host);
    var onVis = function () { sync(); };
    document.addEventListener('visibilitychange', onVis);

    // Pointer events (not hover) so a touch drag also leaves a wake.
    function track(e) { var r = canvas.getBoundingClientRect(); ctrl.setPointer(e.clientX - r.left, e.clientY - r.top, true); }
    function release() { ctrl.setPointer(0, 0, false); }
    if (!reduce) {
      host.addEventListener('pointermove', track, { passive: true });
      host.addEventListener('pointerdown', track, { passive: true });
      host.addEventListener('pointerleave', release);
      host.addEventListener('pointercancel', release);
    }

    apply(); loadSource(); sync();

    var api = {
      scatter: function () { seed += 1; apply(); },
      update: function (opts) {
        opts = opts || {};
        var srcChanged = opts.src !== undefined && opts.src !== o.src;
        Object.assign(o, opts);
        if (opts.colors) colors = resolveCssColors(o.colors, host);
        if (srcChanged) loadSource();
        apply(); sync();
      },
      pause: function () { o.paused = true; sync(); },
      resume: function () { o.paused = false; sync(); },
      destroy: function () {
        destroyed = true;
        if (ro) ro.disconnect(); if (io) io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        host.removeEventListener('pointermove', track); host.removeEventListener('pointerdown', track);
        host.removeEventListener('pointerleave', release); host.removeEventListener('pointercancel', release);
        ctrl.destroy(); layer.remove(); host.classList.remove('pff-host'); host.__pff = null;
      }
    };
    host.__pff = api;
    return api;
  }

  window.PixelFlowField = { init: init, defaults: DEFAULTS };
  function auto() { document.querySelectorAll('[data-pixel-flow-field]').forEach(function (el) { init(el); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
