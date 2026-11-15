/* liquid-nav.js — "Waterline" liquid-glass navbar (vanilla JS port, no dependencies).
   Original React component: Nimbus UI · Liquid Navbar by guglielmogiannattasio.it
   It ENHANCES the existing <nav class="nav-links"> in the header: the links stay in the HTML
   (works without JS / for SEO) and this script swaps them for the animated pill.
   - Active drop = link with aria-current="page".
   - Water is drawn by a tiny WebGL shader (paused off-screen); CSS drop fallback without WebGL.
   - Across pages the drop slides from the previous page's item to the new one.
   Edit ICONS / FX below to change per-link icons and the little scene each icon plays. */
(function () {
  'use strict';
  var src = document.querySelector('header.nav .nav-links');
  if (!src) return;

  var PAD = 14;          // canvas bleed around the pill (shadows + ripples)
  var NAV_DELAY = 480;   // ms to let the drop animate before the browser changes page
  var STORE = 'nimbus-prev';

  /* ---------- icons + per-link effects (keyed by file name) ---------- */
  function svg(d) {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  var ICONS = {
    home: svg('<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M6 9.6V20h12V9.6"/><path class="nv-door" d="M10 20v-5h4v5Z"/>'),
    work: svg('<rect x="3.5" y="7.5" width="17" height="12" rx="2.2"/><path d="M9 7.5V6a1.8 1.8 0 0 1 1.8-1.8h2.4A1.8 1.8 0 0 1 15 6v1.5"/><path d="M3.5 13h17"/>'),
    services: svg('<path d="m12 4 8.5 4.5L12 13 3.5 8.5 12 4Z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/>'),
    about: svg('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.8 20c1.2-3.4 4-5 7.2-5s6 1.6 7.2 5"/>'),
    process: svg('<circle cx="6" cy="6" r="2.3"/><circle cx="18" cy="18" r="2.3"/><path d="M8.3 6H14a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h5.7"/>'),
    contact: svg('<rect x="3.5" y="5.5" width="17" height="13" rx="2.4"/><path d="m4 7.5 8 6 8-6"/>'),
    dot: svg('<circle cx="12" cy="12" r="3.5"/>')
  };
  // fx: plane | drop | spin | glow | wave | pop | none
  var FX = { index: 'glow', work: 'pop', services: 'spin', about: 'wave', process: 'drop', contact: 'plane' };
  function keyOf(href) {
    var f = (href || '').split('#')[0].split('?')[0].split('/').pop().replace('.html', '');
    return f || 'index';
  }
  function iconKey(k) { return k === 'index' ? 'home' : (ICONS[k] ? k : 'dot'); }

  /* ---------- water shader ---------- */
  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FRAG = 'precision highp float;\n' +
    'uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;\n' +
    'uniform vec4 uBlob[6];uniform float uSy[6];uniform vec4 uRip[6];uniform vec3 uMouse;uniform float uDark;uniform float uAmb;\n' +
    'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}\n' +
    'float sdCap(vec2 p,vec4 B,float sy){p-=B.xy;p.y/=sy;p.x=max(abs(p.x)-B.z,0.);return(length(p)-B.w)*min(1.,sy);}\n' +
    'float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}\n' +
    'float dropD(vec2 p){float d=1e4;for(int i=0;i<6;i++){if(uBlob[i].w>.5){d=smin(d,sdCap(p,uBlob[i],uSy[i]),13.);}}return d;}\n' +
    'float pillD(vec2 p){vec2 h=uPill.zw*.5;return sdRB(p-uPill.xy-h,h,h.y);}\n' +
    'float lens(float d,float w){float t=clamp(-d/w,0.,1.);return sqrt(1.-(1.-t)*(1.-t));}\n' +
    'float waves(vec2 p){float w=0.;\n' +
    ' for(int i=0;i<6;i++){vec4 R=uRip[i];if(R.w>0.){float x=length(p-R.xy)-R.z*240.;w+=R.w*exp(-R.z*1.7)*sin(x*.3)*exp(-x*x/700.);}}\n' +
    ' vec2 m=p-uMouse.xy;w+=uMouse.z*3.6*exp(-dot(m,m)/1000.);\n' +
    ' w+=uAmb*(sin(p.x*.05+uTime*1.2)*.45+sin(p.x*.13-uTime*.85+p.y*.2)*.25);return w;}\n' +
    'float H(vec2 p){float dp=pillD(p);return lens(dp,uPill.w*.36)*2.4+lens(dropD(p),11.)*7.5+waves(p)*smoothstep(0.,7.,-dp);}\n' +
    'float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}\n' +
    'void main(){\n' +
    ' vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;\n' +
    ' float dp=pillD(p);float dd=dropD(p);\n' +
    ' float h0=H(p);vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));\n' +
    ' vec3 V=vec3(0.,0.,1.);\n' +
    ' float spec=pow(max(dot(reflect(-normalize(vec3(-.45,-.8,.85)),n),V),0.),70.);\n' +
    ' float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.75,.7)),n),V),0.),22.)*.3;\n' +
    ' float fres=clamp((1.-n.z)*4.,0.,1.);\n' +
    ' vec3 irid=.5+.5*cos(6.2831*(vec3(0.,.33,.67)+fres*.85+p.x*.0028+uTime*.035));\n' +
    ' float pm=smoothstep(1.,-1.,dp);float dm=smoothstep(1.,-1.,dd)*smoothstep(1.,-2.,dp);\n' +
    ' float sh=smoothstep(9.,-9.,dropD(p-vec2(0.,5.)))*(1.-dm)*pm*(.11+.07*uDark);\n' +
    ' vec3 c=vec3(0.,.14,.36)*sh;float a=sh;\n' +
    ' float pa=clamp(pm*(fres*.5+spec*.9+spec2),0.,1.);\n' +
    ' c=mix(vec3(1.),irid,.5*fres)*pa+c*(1.-pa);a=pa+a*(1.-pa);\n' +
    ' float th=lens(dd,11.);\n' +
    ' float cs=caus((p+n.xy*th*18.)*.085,uTime*.9);\n' +
    ' vec3 tint=mix(vec3(.80,.95,1.),vec3(.55,.82,1.),uDark);\n' +
    ' float rim=dm*(1.-smoothstep(0.,8.,-dd));\n' +
    ' float cres=dm*smoothstep(.12,.55,dot(n.xy,normalize(vec2(.55,.85))))*smoothstep(0.,3.,-dd);\n' +
    ' float body=.5+.5*clamp(-n.y*3.,-1.,1.);\n' +
    ' float da=dm*(.26+.14*body)*(1.-.35*uDark);vec3 dc=mix(tint,vec3(1.),body*.6);\n' +
    ' float la=rim*.22;vec3 lc=mix(vec3(0.,.42,.78),vec3(.1,.55,.95),uDark);dc=lc*la+dc*da*(1.-la);da=la+da*(1.-la);\n' +
    ' la=clamp(cres*.7+smoothstep(.6,1.,cs)*.28*th*dm,0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);\n' +
    ' la=clamp(dm*(spec*1.2+spec2*.5),0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);\n' +
    ' la=dm*smoothstep(-2.,0.,dd)*.4;dc=mix(vec3(1.),irid,.35)*la+dc*(1.-la);da=la+da*(1.-la);\n' +
    ' c=dc+c*(1.-da);a=da+a*(1.-da);\n' +
    ' gl_FragColor=vec4(c,a);\n' +
    '}';

  function makeState() {
    return {
      a: { x: 0, v: 0 }, b: { x: 0, v: 0 }, sy: { s: 1, v: 0 },
      lead: 0, lagFrom: 0, sats: [], rips: [],
      t: { x: 0, cy: 0, q: 0, r: 21 }, q: 0,
      mouse: { x: 0, y: 0, s: 0, on: false },
      moving: false, split: false, ready: false,
      w: 0, h: 0, visible: true, reduce: false, raf: 0, last: 0, time: 0, glc: null
    };
  }

  function initGL(canvas) {
    var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return null;
    function sh(type, code) {
      var s = gl.createShader(type);
      gl.shaderSource(s, code);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    gl.useProgram(p);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(p, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var u = {};
    ['uRes', 'uDpr', 'uTime', 'uPill', 'uBlob', 'uSy', 'uRip', 'uMouse', 'uDark', 'uAmb'].forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return { gl: gl, u: u };
  }

  function supportsRefraction() {
    if (typeof CSS === 'undefined' || !CSS.supports) return false;
    var ua = navigator.userAgent;
    return /Chrome\/|Chromium\/|Edg\//.test(ua) && !/Firefox\//.test(ua) && CSS.supports('backdrop-filter', 'url(#a)');
  }

  /* ---------- build the DOM from the existing links ---------- */
  var links = Array.prototype.slice.call(src.querySelectorAll('a'));
  if (!links.length) return;

  var nav = document.createElement('nav');
  nav.className = 'nimbus-nav';
  nav.setAttribute('data-tone', 'dark');
  nav.setAttribute('data-gl', 'on');
  nav.setAttribute('data-refract', 'off');
  nav.setAttribute('aria-label', src.getAttribute('aria-label') || 'Main');

  nav.insertAdjacentHTML('beforeend',
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="nimbus-refract" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves="2" seed="7" result="noise"/>' +
    '<feGaussianBlur in="noise" stdDeviation="2" result="soft"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="soft" scale="60" xChannelSelector="R" yChannelSelector="G"/></filter></svg>' +
    '<span class="nimbus-glass" aria-hidden="true"></span>' +
    '<canvas class="nimbus-water" aria-hidden="true"></canvas>' +
    '<span class="nimbus-drop" aria-hidden="true"></span>');
  var canvas = nav.querySelector('canvas');
  var dropEl = nav.querySelector('.nimbus-drop');

  var current = -1;
  var items = [], iconEls = [], fxKinds = [];
  links.forEach(function (a, i) {
    var k = keyOf(a.getAttribute('href'));
    var label = a.textContent.trim();
    var el = document.createElement('a');
    el.className = 'nimbus-item';
    el.href = a.getAttribute('href');
    el.setAttribute('aria-label', label);
    el.innerHTML = '<span class="nv-ico">' + ICONS[iconKey(k)] + '</span><span class="nimbus-label"></span>';
    el.querySelector('.nimbus-label').textContent = label;
    if (a.getAttribute('aria-current') === 'page') { current = i; el.setAttribute('aria-current', 'page'); }
    nav.appendChild(el);
    items.push(el);
    iconEls.push(el.querySelector('.nv-ico'));
    fxKinds.push(FX[k] || 'pop');
  });
  if (current < 0) nav.setAttribute('data-none', 'true'); // page not in the menu: no active drop

  var header = src.closest('header.nav');
  if (header) header.classList.add('has-liquid');
  src.replaceWith(nav);

  /* ---------- state + drawing + physics ---------- */
  var st = makeState();
  var dark = 1;
  var startIdx = -1;
  try {
    var prev = parseInt(sessionStorage.getItem(STORE), 10);
    sessionStorage.removeItem(STORE);
    if (!isNaN(prev) && prev >= 0 && prev < items.length) startIdx = prev;
  } catch (e) {}

  function draw() {
    var s = st, T = s.t;
    var sep = Math.abs(s.a.x - s.b.x);
    var thin = Math.min(sep / (2 * (s.q + T.r) || 1), 1);
    var r = T.r * (1 - 0.3 * thin);
    if (s.glc) {
      var g = s.glc.gl, u = s.glc.u;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
      g.uniform2f(u.uRes, s.w + PAD * 2, s.h + PAD * 2);
      g.uniform1f(u.uDpr, dpr);
      g.uniform1f(u.uTime, s.time);
      g.uniform4f(u.uPill, PAD, PAD, s.w, s.h);
      var blobs = new Float32Array(24);
      var sy = new Float32Array(6).fill(1);
      var head = s.lead === 0 ? s.a : s.b, tail = s.lead === 0 ? s.b : s.a;
      blobs.set([head.x, T.cy, s.q * (1 - 0.25 * thin), T.r * (1 - 0.12 * thin), tail.x, T.cy, s.q * (1 - 0.8 * thin), T.r * (1 - 0.5 * thin)], 0);
      sy[0] = sy[1] = s.sy.s;
      s.sats.slice(0, 4).forEach(function (d, i) { blobs.set([d.x, d.y, 0, d.r], 8 + i * 4); });
      if (nav.hasAttribute('data-none')) blobs.fill(0); // hide the drop when no item is active
      g.uniform4fv(u.uBlob, blobs);
      g.uniform1fv(u.uSy, sy);
      var rips = new Float32Array(24);
      s.rips.slice(-6).forEach(function (p, i) { rips.set([p.x, p.y, p.age, p.amp], i * 4); });
      g.uniform4fv(u.uRip, rips);
      g.uniform3f(u.uMouse, s.mouse.x, s.mouse.y, s.mouse.s);
      g.uniform1f(u.uDark, dark);
      g.uniform1f(u.uAmb, s.reduce ? 0 : 1);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
      g.drawArrays(g.TRIANGLES, 0, 3);
    } else {
      var left = Math.min(s.a.x, s.b.x) - s.q - r - PAD;
      var width = sep + 2 * (s.q + r);
      dropEl.style.width = width + 'px';
      dropEl.style.transform = 'translateX(' + left + 'px) scaleY(' + s.sy.s + ')';
    }
  }

  function step(dt, now) {
    var s = st, T = s.t;
    s.time += dt;
    s.q += (T.q - s.q) * Math.min(1, dt * 12);
    var bodies = [s.a, s.b];
    var still = true;
    if (s.reduce) {
      s.a.x = s.b.x = T.x; s.a.v = s.b.v = 0; s.sy.s = 1; s.sats = [];
    } else {
      bodies.forEach(function (B, i) {
        var lead = i === s.lead;
        var k = lead ? 210 : 72;
        var c = lead ? 25 : 13;
        var f = !lead && now < s.lagFrom ? 0.08 : 1;
        B.v += (k * (T.x - B.x) - c * B.v) * dt * f;
        B.x += B.v * dt;
        var lo = PAD + 6 + s.q + T.r - 3, hi = PAD + s.w - 6 - s.q - T.r + 3;
        if (B.x < lo || B.x > hi) {
          s.sy.v -= Math.min(Math.abs(B.v), 900) * 0.0016;
          B.x = Math.max(lo, Math.min(hi, B.x));
          B.v *= -0.25;
        }
        if (Math.abs(T.x - B.x) > 0.3 || Math.abs(B.v) > 3) still = false;
      });
      var L = bodies[s.lead];
      var syT = 1 - 0.2 * Math.min(Math.abs(L.v) / 1500, 1);
      s.sy.v += (280 * (syT - s.sy.s) - 9 * s.sy.v) * dt;
      s.sy.s += s.sy.v * dt;
      if (Math.abs(s.sy.s - 1) > 0.002 || Math.abs(s.sy.v) > 0.02) still = false;
      // break the neck: spawn droplets between head and tail
      var sep = Math.abs(s.a.x - s.b.x);
      var r = T.r * (1 - 0.3 * Math.min(sep / (2 * (T.q + T.r) || 1), 1));
      if (!s.split && s.moving && sep - 2 * T.q - 2 * r > -6) {
        s.split = true;
        var lo2 = bodies[1 - s.lead], hi2 = bodies[s.lead];
        [0.3, 0.5, 0.72].forEach(function (t, j) {
          s.sats.push({
            x: lo2.x + (hi2.x - lo2.x) * t + (Math.random() - 0.5) * 6,
            y: T.cy + (Math.random() - 0.5) * 10,
            vx: (lo2.v + hi2.v) * 0.45,
            vy: (Math.random() - 0.5) * 60,
            r: 5 + Math.random() * 3 - j * 0.5,
            k: 70 + Math.random() * 90
          });
        });
      }
      s.sats = s.sats.filter(function (d) {
        d.vx += (d.k * (T.x - d.x) - 9 * d.vx) * dt;
        d.vy += (90 * (T.cy - d.y) - 7 * d.vy) * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.x = Math.max(PAD + 8 + d.r, Math.min(PAD + s.w - 8 - d.r, d.x));
        d.y = Math.max(T.cy - T.r + d.r, Math.min(T.cy + T.r - d.r, d.y));
        if (Math.abs(T.x - d.x) < T.q + T.r * 0.5) d.r -= dt * 26;
        return d.r > 0.6;
      });
      if (s.sats.length) still = false;
    }
    if (s.moving && still) {
      s.moving = false;
      if (s.split || !s.reduce) s.rips.push({ x: T.x, y: T.cy, age: 0, amp: s.split ? 1.2 : 0.7 });
    }
    s.rips.forEach(function (p) { p.age += dt; });
    s.rips = s.rips.filter(function (p) { return p.age < 2.4; });
    var target = s.mouse.on ? 1 : 0;
    s.mouse.s += (target - s.mouse.s) * Math.min(1, dt * 7);
  }

  function loop() {
    var s = st;
    if (s.raf) return;
    s.last = performance.now();
    function tick(now) {
      var dt = Math.min((now - s.last) / 1000, 1 / 30);
      s.last = now;
      step(dt, now);
      draw();
      var busy = s.moving || s.rips.length || s.sats.length || s.mouse.s > 0.01;
      // ambient water keeps moving while visible; reduced-motion only animates on change
      if (s.visible && (!s.reduce || busy)) s.raf = requestAnimationFrame(tick);
      else s.raf = 0;
    }
    s.raf = requestAnimationFrame(tick);
  }

  /* ---------- layout ---------- */
  function measure() {
    var idx = current < 0 ? 0 : current;
    var el = items[idx];
    if (!el || !nav.offsetWidth) return; // header hidden (mobile): nothing to measure
    var s = st, T = s.t;
    s.w = nav.offsetWidth;
    s.h = nav.offsetHeight;
    T.r = el.offsetHeight / 2;
    T.q = Math.max(0, el.offsetWidth / 2 - T.r);
    T.cy = PAD + el.offsetTop + el.offsetHeight / 2;
    var nx = PAD + el.offsetLeft + el.offsetWidth / 2;
    if (!s.ready) {
      var sx = nx;
      if (startIdx >= 0 && startIdx !== current && items[startIdx]) {
        sx = PAD + items[startIdx].offsetLeft + items[startIdx].offsetWidth / 2;
      }
      startIdx = -1;
      s.a.x = s.b.x = sx;
      s.q = T.q;
      s.ready = true;
      if (Math.abs(sx - nx) > 0.5) {
        s.lead = 0;
        s.lagFrom = performance.now() + 70;
        s.moving = true;
        s.split = false;
      }
    } else if (Math.abs(nx - T.x) > 0.5) {
      s.lead = Math.abs(nx - s.a.x) <= Math.abs(nx - s.b.x) ? 0 : 1;
      s.lagFrom = performance.now() + 70;
      s.moving = true;
      s.split = false;
    }
    T.x = nx;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = s.w + PAD * 2, Hh = s.h + PAD * 2;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(Hh * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(Hh * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = Hh + 'px';
    }
    loop();
  }

  /* ---------- init ---------- */
  nav.setAttribute('data-refract', supportsRefraction() ? 'on' : 'off');
  st.reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  st.glc = initGL(canvas);
  if (!st.glc) nav.setAttribute('data-gl', 'off');
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); st.glc = null; nav.setAttribute('data-gl', 'off'); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { st.visible = entries[0].isIntersecting; if (st.visible) loop(); }).observe(nav);
  }
  document.addEventListener('visibilitychange', function () { st.visible = document.visibilityState === 'visible'; if (st.visible) loop(); });

  measure();
  if ('ResizeObserver' in window) {
    var lastW = -1;
    new ResizeObserver(function () {
      var w = nav.offsetWidth;
      if (lastW === -1) { lastW = w; return; } // first callback = initial layout, keep the entry animation
      if (w !== lastW) { lastW = w; st.ready = false; measure(); }
    }).observe(nav);
  }
  // web fonts change item widths once loaded
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { st.ready = false; measure(); });

  /* ---------- interaction ---------- */
  function local(cx, cy) {
    var r = nav.getBoundingClientRect();
    return { x: cx - r.left + PAD, y: cy - r.top + PAD };
  }
  function ripple(x, y, amp) {
    if (st.reduce) return;
    st.rips.push({ x: x, y: y, age: 0, amp: amp });
    loop();
  }
  function iconCenter(i) {
    var b = iconEls[i].getBoundingClientRect();
    return local(b.left + b.width / 2, b.top + b.height / 2);
  }
  function playFx(i) {
    var kind = fxKinds[i];
    iconEls.forEach(function (e) { e.removeAttribute('data-fx'); });
    if (kind === 'none') return;
    void iconEls[i].offsetWidth; // restart the animation
    iconEls[i].setAttribute('data-fx', kind);
    var c = iconCenter(i);
    if (kind === 'drop') setTimeout(function () { ripple(c.x, st.t.cy, 1.4); }, 430);
    if (kind === 'plane') ripple(c.x, c.y, 0.6);
  }
  function setCurrent(i) {
    items.forEach(function (el, j) { if (j === i) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
    nav.removeAttribute('data-none');
    current = i;
    measure();
  }

  items.forEach(function (el, i) {
    el.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (el.origin !== location.origin) return;
      e.preventDefault();
      var same = i === current;
      playFx(i);
      if (same) return;
      try { sessionStorage.setItem(STORE, String(current < 0 ? i : current)); } catch (err) {}
      setCurrent(i);
      var href = el.href;
      setTimeout(function () { location.href = href; }, st.reduce ? 0 : NAV_DELAY);
    });
  });

  nav.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    var from = items.indexOf(document.activeElement);
    if (from < 0) from = current < 0 ? 0 : current;
    var n = (from + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    items[n].focus();
  });
  nav.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var p = local(e.clientX, e.clientY);
    st.mouse.x = p.x; st.mouse.y = p.y; st.mouse.on = true;
    loop();
  });
  nav.addEventListener('pointerleave', function () { st.mouse.on = false; loop(); });
  nav.addEventListener('pointerdown', function (e) { var p = local(e.clientX, e.clientY); ripple(p.x, p.y, 0.8); });

  // back/forward cache: restore the drop on the right item
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var idx = -1;
    links.forEach(function (a, i) { if (a.getAttribute('aria-current') === 'page') idx = i; });
    if (idx >= 0 && idx !== current) setCurrent(idx);
  });
})();
