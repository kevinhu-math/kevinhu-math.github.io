/* geometry.js
   The interactive triangle-centres board at the top of the page.

   Drag A, B or C with the mouse or a finger. Keyboard: focus the board, press
   1, 2 or 3 to pick a vertex, then use the arrow keys. The panel on the right
   recomputes as you drag, so Euler's relation OI^2 = R^2 - 2Rr and the
   2 : 1 : 3 division of the Euler line can be watched holding in real time.

   Usage: <script src="geometry.js" defer></script> */

(function () {
  'use strict';

  const board = document.getElementById('board');
  const canvas = document.getElementById('figure');
  if (!board || !canvas) return;
  const ctx = canvas.getContext('2d');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- state ---------- */

  // stored as fractions of the board, so a resize keeps the shape
  const verts = [
    { fx: 0.30, fy: 0.24, x: 0, y: 0 },
    { fx: 0.76, fy: 0.40, x: 0, y: 0 },
    { fx: 0.40, fy: 0.80, x: 0, y: 0 }
  ];
  const NAMES = ['A', 'B', 'C'];

  const show = {
    circumcircle: true,
    ninepoint: true,
    incircle: true,
    euler: true,
    medians: false,
    altitudes: false,
    contact: false
  };

  let W = 0, H = 0;
  let dragging = -1, selected = -1, touched = false, t0 = 0;

  /* ---------- geometry ---------- */

  const dist = (P, Q) => Math.hypot(P.x - Q.x, P.y - Q.y);
  const mid = (P, Q) => ({ x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 });

  function foot(P, A, B) {
    const dx = B.x - A.x, dy = B.y - A.y;
    const L2 = dx * dx + dy * dy || 1;
    const s = ((P.x - A.x) * dx + (P.y - A.y) * dy) / L2;
    return { x: A.x + s * dx, y: A.y + s * dy };
  }

  function circumcentre(A, B, C) {
    const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    if (Math.abs(d) < 1e-6) return null;
    const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
    return {
      x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d,
      y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d
    };
  }

  function scene() {
    const A = verts[0], B = verts[1], C = verts[2];
    const O = circumcentre(A, B, C);
    if (!O) return null;

    const a = dist(B, C), b = dist(C, A), c = dist(A, B);
    const s = (a + b + c) / 2;
    const area = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;

    const G = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
    const Hh = { x: A.x + B.x + C.x - 2 * O.x, y: A.y + B.y + C.y - 2 * O.y };
    const N = mid(O, Hh);
    const I = {
      x: (a * A.x + b * B.x + c * C.x) / (2 * s),
      y: (a * A.y + b * B.y + c * C.y) / (2 * s)
    };

    const along = (P, Q, d) => {
      const L = dist(P, Q) || 1;
      return { x: P.x + (Q.x - P.x) * d / L, y: P.y + (Q.y - P.y) * d / L };
    };

    return {
      A, B, C, O, G, H: Hh, N, I,
      R: dist(O, A),
      r: area / s,
      mids: [mid(B, C), mid(C, A), mid(A, B)],
      feet: [foot(A, B, C), foot(B, C, A), foot(C, A, B)],
      eulerPts: [mid(A, Hh), mid(B, Hh), mid(C, Hh)],
      touch: [along(B, C, s - b), along(C, A, s - c), along(A, B, s - a)]
    };
  }

  /* ---------- drawing ---------- */

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function resize() {
    const rect = board.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    verts.forEach(v => { v.x = v.fx * W; v.y = v.fy * H; });
  }

  function stroke(colour, w, alpha, dash) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.globalAlpha = alpha;
    ctx.setLineDash(dash || []);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  function line(P, Q, colour, w, alpha, dash) {
    ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y);
    stroke(colour, w, alpha, dash);
  }

  function arc(P, r, colour, w, alpha, dash) {
    ctx.beginPath(); ctx.arc(P.x, P.y, Math.max(r, 0), 0, Math.PI * 2);
    stroke(colour, w, alpha, dash);
  }

  function dot(P, colour, r, alpha) {
    ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, Math.PI * 2);
    ctx.fillStyle = colour; ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fill(); ctx.globalAlpha = 1;
  }

  function tag(P, text, colour, dx, dy) {
    ctx.fillStyle = colour;
    ctx.font = 'italic 19px "Instrument Serif", Georgia, serif';
    ctx.fillText(text, P.x + (dx || 10), P.y + (dy || -10));
  }

  function handle(P, name, chalk, active) {
    if (active) arc(P, 16, chalk, 1, 0.5, [3, 4]);
    dot(P, chalk, 6);
    dot(P, css('--board') || '#22332f', 2.5);
    tag(P, name, chalk, 13, -12);
  }

  function render() {
    const chalk = css('--chalk') || '#eef2ea';
    const cyan = css('--chalk-cyan') || '#8fd3e8';
    const rose = css('--chalk-rose') || '#f2a49c';
    const gold = css('--chalk-gold') || '#f2d98d';

    ctx.clearRect(0, 0, W, H);
    const S = scene();
    if (!S) return;

    if (show.circumcircle) arc(S.O, S.R, chalk, 1.2, 0.4);

    if (show.medians) {
      S.mids.forEach((M, i) => line(verts[i], M, chalk, 1, 0.3, [4, 6]));
    }
    if (show.altitudes) {
      S.feet.forEach((F, i) => line(verts[i], F, gold, 1, 0.45, [3, 6]));
      S.feet.forEach(F => dot(F, gold, 3, 0.8));
    }

    if (show.ninepoint) {
      arc(S.N, S.R / 2, cyan, 1.6, 0.9, [7, 6]);
      S.mids.concat(S.feet, S.eulerPts).forEach(P => dot(P, cyan, 3, 0.75));
    }

    if (show.incircle) arc(S.I, S.r, rose, 1.8, 0.95);
    if (show.contact) {
      line(S.touch[0], S.touch[1], rose, 1, 0.4);
      line(S.touch[1], S.touch[2], rose, 1, 0.4);
      line(S.touch[2], S.touch[0], rose, 1, 0.4);
      S.touch.forEach(P => dot(P, rose, 3, 0.85));
    }

    if (show.euler) {
      const ex = S.H.x - S.O.x, ey = S.H.y - S.O.y;
      const L = Math.hypot(ex, ey) || 1;
      const ux = ex / L, uy = ey / L, e = Math.max(W, H);
      line({ x: S.O.x - ux * e, y: S.O.y - uy * e },
           { x: S.H.x + ux * e, y: S.H.y + uy * e }, cyan, 1, 0.35);
    }

    // the triangle itself, over the working lines
    line(S.A, S.B, chalk, 2, 0.95);
    line(S.B, S.C, chalk, 2, 0.95);
    line(S.C, S.A, chalk, 2, 0.95);

    const centres = [[S.O, 'O', chalk], [S.G, 'G', chalk], [S.N, 'N', cyan], [S.H, 'H', chalk], [S.I, 'I', rose]];
    centres.forEach(c => { dot(c[0], c[2], 3.5, 0.95); tag(c[0], c[1], c[2]); });

    verts.forEach((v, i) => handle(v, NAMES[i], chalk, i === dragging || i === selected));

    readout(S);
  }

  /* ---------- live numbers ---------- */

  const out = {};
  ['R', 'r', 'OI', 'euler', 'ratio'].forEach(k => { out[k] = document.getElementById('out-' + k); });

  function readout(S) {
    if (!out.R) return;
    const u = S.R / 100;                       // scale so the numbers stay readable
    const OI = dist(S.O, S.I);
    const rhs = Math.sqrt(Math.max(S.R * S.R - 2 * S.R * S.r, 0));
    out.R.textContent = (S.R / u / 100).toFixed(3);
    out.r.textContent = (S.r / u / 100).toFixed(3);
    out.OI.textContent = (OI / u / 100).toFixed(3);
    out.euler.textContent = (rhs / u / 100).toFixed(3);
    const og = dist(S.O, S.G), gn = dist(S.G, S.N), nh = dist(S.N, S.H);
    const unit = gn || 1;
    out.ratio.textContent = (og / unit).toFixed(2) + ' : 1 : ' + (nh / unit).toFixed(2);
  }

  /* ---------- interaction ---------- */

  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function nearest(P) {
    let best = -1, bd = 26;
    verts.forEach((v, i) => { const d = dist(v, P); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  canvas.addEventListener('pointerdown', e => {
    const P = pointerPos(e);
    const i = nearest(P);
    if (i >= 0) {
      dragging = i; selected = i; touched = true;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
      render();
    }
  });

  canvas.addEventListener('pointermove', e => {
    const P = pointerPos(e);
    if (dragging >= 0) {
      const v = verts[dragging];
      v.x = Math.max(24, Math.min(W - 24, P.x));
      v.y = Math.max(24, Math.min(H - 24, P.y));
      v.fx = v.x / W; v.fy = v.y / H;
      render();
    } else {
      canvas.style.cursor = nearest(P) >= 0 ? 'grab' : 'default';
    }
  });

  function endDrag() { dragging = -1; canvas.style.cursor = 'default'; render(); }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('keydown', e => {
    if (e.key === '1' || e.key === '2' || e.key === '3') {
      selected = Number(e.key) - 1; touched = true; render(); e.preventDefault(); return;
    }
    if (selected < 0) return;
    const step = e.shiftKey ? 20 : 5;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!move) return;
    const v = verts[selected];
    v.x = Math.max(24, Math.min(W - 24, v.x + move[0]));
    v.y = Math.max(24, Math.min(H - 24, v.y + move[1]));
    v.fx = v.x / W; v.fy = v.y / H;
    touched = true; render(); e.preventDefault();
  });

  document.querySelectorAll('[data-layer]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.layer;
      show[key] = !show[key];
      btn.setAttribute('aria-pressed', String(show[key]));
      render();
    });
    btn.setAttribute('aria-pressed', String(!!show[btn.dataset.layer]));
  });

  const reset = document.getElementById('reset');
  if (reset) {
    reset.addEventListener('click', () => {
      const preset = [[0.30, 0.24], [0.76, 0.40], [0.40, 0.80]];
      verts.forEach((v, i) => { v.fx = preset[i][0]; v.fy = preset[i][1]; v.x = v.fx * W; v.y = v.fy * H; });
      selected = -1; touched = true; render();
    });
  }

  /* ---------- idle drift, until the reader takes over ---------- */

  function frame(t) {
    if (!touched) {
      if (!t0) t0 = t;
      const e = (t - t0);
      verts[0].x = (0.30 + 0.020 * Math.sin(e * 0.00040)) * W;
      verts[0].y = (0.24 + 0.024 * Math.cos(e * 0.00031)) * H;
      verts[1].x = (0.76 + 0.020 * Math.sin(e * 0.00027 + 2)) * W;
      verts[1].y = (0.40 + 0.024 * Math.cos(e * 0.00036 + 2)) * H;
      verts[2].x = (0.40 + 0.024 * Math.sin(e * 0.00034 + 4)) * W;
      verts[2].y = (0.80 + 0.018 * Math.cos(e * 0.00029 + 4)) * H;
      verts.forEach(v => { v.fx = v.x / W; v.fy = v.y / H; });
      render();
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', () => { resize(); render(); });
  resize();
  render();
  if (!reduced) requestAnimationFrame(frame); else touched = true;
})();
