/* three-background.js — subtle particle + wireframe environment. Falls back to the CSS gradient if WebGL/Three.js is unavailable. */
(function () {
  'use strict';
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || !window.THREE) { if (canvas) canvas.remove(); return; }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { canvas.remove(); return; }

  // Check WebGL support.
  try { const t = document.createElement('canvas'); if (!(t.getContext('webgl') || t.getContext('experimental-webgl'))) throw 0; }
  catch (e) { canvas.remove(); return; }

  const mobile = window.matchMedia('(max-width: 760px)').matches;
  const COUNT = mobile ? 220 : 700;               // particle limit
  const home = document.body.dataset.page === 'home';

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: 'low-power' }); }
  catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 14;

  // Particles
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) { pos[i * 3] = (Math.random() - .5) * 40; pos[i * 3 + 1] = (Math.random() - .5) * 26; pos[i * 3 + 2] = (Math.random() - .5) * 30; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xA78BFA, size: mobile ? 0.07 : 0.05, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(pts);

  // Geometric objects (home gets a larger presence, other pages a quieter one)
  const wire = new THREE.MeshBasicMaterial({ color: 0x8B5CF6, wireframe: true, transparent: true, opacity: home ? 0.28 : 0.12 });
  const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(home ? 3.6 : 2.6, 1), wire);
  ico.position.set(home ? 6 : 8, home ? 0.5 : 3, -4);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.01, 8, 80), new THREE.MeshBasicMaterial({ color: 0xA78BFA, transparent: true, opacity: 0.35 }));
  ring.position.copy(ico.position); ring.scale.setScalar(home ? 2.2 : 1.6);
  scene.add(ico, ring);

  function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize();
  window.addEventListener('resize', resize);

  let mx = 0, my = 0, tx = 0, ty = 0;
  if (!mobile) window.addEventListener('pointermove', function (e) { mx = e.clientX / window.innerWidth - .5; my = e.clientY / window.innerHeight - .5; }, { passive: true });

  let running = true, raf = 0;
  const clock = new THREE.Clock();
  function loop() {
    if (!running) return;
    const t = clock.getElapsedTime();
    tx += (mx - tx) * 0.04; ty += (my - ty) * 0.04;
    pts.rotation.y = t * 0.012 + tx * 0.3; pts.rotation.x = ty * 0.2;
    ico.rotation.x = t * 0.08; ico.rotation.y = t * 0.12;
    ring.rotation.x = t * 0.1 + 1; ring.rotation.y = t * 0.06;
    camera.position.x = tx * 1.2; camera.position.y = -ty * 0.8; camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  // Pause when tab hidden.
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { clock.getDelta(); raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
  });
  loop();
})();
