/* geometry.js
   Draws a live triangle behind the page: circumcircle, incircle, nine-point
   circle and the Euler line through O, N and H. The vertex nearest the cursor
   is gently pulled towards it, so the whole configuration responds as you
   move the mouse. Respects prefers-reduced-motion (draws one static frame).

   Usage: add <script src="geometry.js" defer></script> to the page. */

(function () {
  'use strict';

  const canvas = document.createElement('canvas');
  canvas.id = 'geo-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1;

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Three vertices. Each drifts on its own slow Lissajous path around a home point.
  const verts = [
    { hx: 0.18, hy: 0.30, ax: 0.05, ay: 0.06, fx: 0.00021, fy: 0.00017, p: 0.0, x: 0, y: 0 },
    { hx: 0.82, hy: 0.22, ax: 0.05, ay: 0.06, fx: 0.00018, fy: 0.00023, p: 2.1, x: 0, y: 0 },
    { hx: 0.55, hy: 0.86, ax: 0.07, ay: 0.05, fx: 0.00016, fy: 0.00020, p: 4.2, x: 0, y: 0 }
  ];

  const mouse = { x: -1e9, y: -1e9, active: false };
  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  });
  window.addEventListener('mouseleave', function () { mouse.active = false; });

  function homePosition(v, t) {
    return {
      x: (v.hx + v.ax * Math.sin(v.fx * t + v.p)) * W,
      y: (v.hy + v.ay * Math.cos(v.fy * t + v.p)) * H
    };
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

  function dist(P, Q) { return Math.hypot(P.x - Q.x, P.y - Q.y); }

  function circle(P, r, color, width, dash) {
    ctx.beginPath();
    ctx.setLineDash(dash || []);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.arc(P.x, P.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function segment(P, Q, color, width, dash) {
    ctx.beginPath();
    ctx.setLineDash(dash || []);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.moveTo(P.x, P.y);
    ctx.lineTo(Q.x, Q.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function dot(P, color, r) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(P.x, P.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function label(P, text, color, dx, dy) {
    ctx.fillStyle = color;
    ctx.font = 'italic 14px Fraunces, Georgia, serif';
    ctx.fillText(text, P.x + dx, P.y + dy);
  }

  function draw(t) {
    const ink = css('--ink') || '#14213d';
    const rule = css('--rule') || '#0e7c86';
    const pencil = css('--pencil') || '#b23a2f';

    // update vertex positions: drift, then pull the nearest vertex towards the cursor
    verts.forEach(function (v) {
      const h = homePosition(v, t);
      v.x += (h.x - v.x) * 0.02;
      v.y += (h.y - v.y) * 0.02;
    });
    if (mouse.active) {
      let best = null, bd = Infinity;
      verts.forEach(function (v) {
        const d = dist(v, mouse);
        if (d < bd) { bd = d; best = v; }
      });
      if (best && bd < Math.max(W, H) * 0.45) {
        best.x += (mouse.x - best.x) * 0.06;
        best.y += (mouse.y - best.y) * 0.06;
      }
    }

    const A = verts[0], B = verts[1], C = verts[2];
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 0.55;

    // triangle
    segment(A, B, ink, 1); segment(B, C, ink, 1); segment(C, A, ink, 1);

    const O = circumcentre(A, B, C);
    if (O) {
      const R = dist(O, A);
      circle(O, R, ink, 0.8);

      // orthocentre and nine-point centre
      const Hp = { x: A.x + B.x + C.x - 2 * O.x, y: A.y + B.y + C.y - 2 * O.y };
      const N = { x: (O.x + Hp.x) / 2, y: (O.y + Hp.y) / 2 };
      circle(N, R / 2, rule, 1, [5, 6]);

      // Euler line, extended a little beyond O and H
      const ex = Hp.x - O.x, ey = Hp.y - O.y;
      const L = Math.hypot(ex, ey) || 1;
      const ux = ex / L, uy = ey / L, ext = 90;
      segment({ x: O.x - ux * ext, y: O.y - uy * ext }, { x: Hp.x + ux * ext, y: Hp.y + uy * ext }, rule, 0.8);

      // incircle: centre weighted by side lengths, radius area / semiperimeter
      const a = dist(B, C), b = dist(C, A), c = dist(A, B);
      const s = (a + b + c) / 2;
      const I = { x: (a * A.x + b * B.x + c * C.x) / (2 * s), y: (a * A.y + b * B.y + c * C.y) / (2 * s) };
      const area = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
      circle(I, area / s, pencil, 1.2);

      ctx.globalAlpha = 0.85;
      dot(O, ink, 2.5); label(O, 'O', ink, 7, -6);
      dot(Hp, ink, 2.5); label(Hp, 'H', ink, 7, -6);
      dot(N, rule, 2.5); label(N, 'N', rule, 7, -6);
      dot(I, pencil, 2.5); label(I, 'I', pencil, 7, -6);
    }

    ctx.globalAlpha = 0.9;
    [A, B, C].forEach(function (P, i) {
      dot(P, ink, 3);
      label(P, 'ABC'[i], ink, 8, -8);
    });
    ctx.globalAlpha = 1;
  }

  // initialise vertices at their home positions so the first frame is sensible
  verts.forEach(function (v) { const h = homePosition(v, 0); v.x = h.x; v.y = h.y; });

  if (reduced) {
    draw(0);
    window.addEventListener('resize', function () { draw(0); });
  } else {
    (function frame(t) { draw(t); requestAnimationFrame(frame); })(0);
  }
})();
