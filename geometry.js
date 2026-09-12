/* geometry.js
   A live triangle-centres configuration drawn behind the page.

   Contents: circumcircle, medians through the centroid, altitudes, the
   nine-point circle with all nine of its defining points, the incircle with
   its contact triangle, and the Euler line through O, G, N and H.

   It is drawn on two canvases: one behind the content sheet at full strength,
   one over the sheet at low opacity, so the construction reads continuously
   across the whole page instead of vanishing behind the white column.

   The vertex nearest the cursor is pulled towards it. Click the background to
   reshuffle. Respects prefers-reduced-motion by drawing a single frame.

   Usage: <script src="geometry.js" defer></script> */

(function () {
  'use strict';

  function makeCanvas(id, z) {
    const c = document.createElement('canvas');
    c.id = id;
    c.setAttribute('aria-hidden', 'true');
    c.style.zIndex = z;
    return c;
  }

  const back = makeCanvas('geo-back', '0');
  const front = makeCanvas('geo-front', '5');
  document.body.prepend(back);
  document.body.appendChild(front);
  const bctx = back.getContext('2d');
  const fctx = front.getContext('2d');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, box = { x: 0, y: 0, w: 0, h: 0 };

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    [back, front].forEach(function (c) {
      c.width = W * dpr;
      c.height = H * dpr;
    });
    [bctx, fctx].forEach(function (c) { c.setTransform(dpr, 0, 0, dpr, 0, 0); });
    // On very wide screens keep the figure in a band around the centre so it
    // does not spread into the far corners and lose its shape.
    const bw = Math.min(W, 1400);
    box = { x: (W - bw) / 2, y: 0, w: bw, h: H };
  }
  window.addEventListener('resize', resize);
  resize();

  const verts = [
    { hx: 0.16, hy: 0.24, ax: 0.045, ay: 0.070, fx: 0.00021, fy: 0.00017, p: 0.0, x: 0, y: 0 },
    { hx: 0.86, hy: 0.32, ax: 0.045, ay: 0.070, fx: 0.00018, fy: 0.00023, p: 2.1, x: 0, y: 0 },
    { hx: 0.44, hy: 0.88, ax: 0.065, ay: 0.045, fx: 0.00016, fy: 0.00020, p: 4.2, x: 0, y: 0 }
  ];

  const mouse = { x: 0, y: 0, active: false };
  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  });
  window.addEventListener('mouseleave', function () { mouse.active = false; });
  window.addEventListener('click', function (e) {
    if (e.target.closest('a, button, input, textarea, select, iframe')) return;
    verts.forEach(function (v) { v.p = Math.random() * Math.PI * 2; });
  });

  function home(v, t) {
    return {
      x: box.x + (v.hx + v.ax * Math.sin(v.fx * t + v.p)) * box.w,
      y: box.y + (v.hy + v.ay * Math.cos(v.fy * t + v.p)) * box.h
    };
  }

  const dist = function (P, Q) { return Math.hypot(P.x - Q.x, P.y - Q.y); };
  const mid = function (P, Q) { return { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 }; };

  function foot(P, A, B) {                       // perpendicular foot of P on line AB
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
    const Ho = { x: A.x + B.x + C.x - 2 * O.x, y: A.y + B.y + C.y - 2 * O.y };
    const N = mid(O, Ho);
    const I = { x: (a * A.x + b * B.x + c * C.x) / (2 * s), y: (a * A.y + b * B.y + c * C.y) / (2 * s) };

    const mids = [mid(B, C), mid(C, A), mid(A, B)];
    const feet = [foot(A, B, C), foot(B, C, A), foot(C, A, B)];
    const euler = [mid(A, Ho), mid(B, Ho), mid(C, Ho)];

    function along(P, Q, d) {
      const L = dist(P, Q) || 1;
      return { x: P.x + (Q.x - P.x) * d / L, y: P.y + (Q.y - P.y) * d / L };
    }
    const touch = [along(B, C, s - b), along(C, A, s - c), along(A, B, s - a)];

    return {
      A: A, B: B, C: C, O: O, G: G, Ho: Ho, N: N, I: I,
      R: dist(O, A), r: area / s,
      mids: mids, feet: feet, euler: euler, touch: touch
    };
  }

  function draw(ctx, k) {                        // k scales every opacity
    const ink = css('--ink') || '#14213d';
    const rule = css('--rule') || '#0e7c86';
    const pencil = css('--pencil') || '#b23a2f';
    const S = scene();
    ctx.clearRect(0, 0, W, H);
    if (!S) return;

    function line(P, Q, colour, w, alpha, dash) {
      ctx.globalAlpha = alpha * k;
      ctx.strokeStyle = colour;
      ctx.lineWidth = w;
      ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    function arc(P, r, colour, w, alpha, dash) {
      ctx.globalAlpha = alpha * k;
      ctx.strokeStyle = colour;
      ctx.lineWidth = w;
      ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.arc(P.x, P.y, Math.max(r, 0), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    function dot(P, colour, r, alpha) {
      ctx.globalAlpha = alpha * k;
      ctx.fillStyle = colour;
      ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, Math.PI * 2); ctx.fill();
    }
    function tag(P, text, colour, alpha) {
      ctx.globalAlpha = alpha * k;
      ctx.fillStyle = colour;
      ctx.font = 'italic 15px Fraunces, Georgia, serif';
      ctx.fillText(text, P.x + 8, P.y - 8);
    }

    arc(S.O, S.R, ink, 1.1, 0.45);

    [[S.A, S.mids[0]], [S.B, S.mids[1]], [S.C, S.mids[2]]].forEach(function (p) {
      line(p[0], p[1], ink, 0.8, 0.30, [3, 5]);
    });
    [[S.A, S.feet[0]], [S.B, S.feet[1]], [S.C, S.feet[2]]].forEach(function (p) {
      line(p[0], p[1], rule, 0.8, 0.35, [2, 6]);
    });

    arc(S.N, S.R / 2, rule, 1.4, 0.75, [6, 6]);
    S.mids.concat(S.feet, S.euler).forEach(function (P) { dot(P, rule, 2, 0.6); });

    arc(S.I, S.r, pencil, 1.6, 0.8);
    line(S.touch[0], S.touch[1], pencil, 0.8, 0.35);
    line(S.touch[1], S.touch[2], pencil, 0.8, 0.35);
    line(S.touch[2], S.touch[0], pencil, 0.8, 0.35);

    const ex = S.Ho.x - S.O.x, ey = S.Ho.y - S.O.y;
    const L = Math.hypot(ex, ey) || 1;
    const ux = ex / L, uy = ey / L, e = 120;
    line({ x: S.O.x - ux * e, y: S.O.y - uy * e },
         { x: S.Ho.x + ux * e, y: S.Ho.y + uy * e }, rule, 1.1, 0.6);

    line(S.A, S.B, ink, 1.6, 0.7); line(S.B, S.C, ink, 1.6, 0.7); line(S.C, S.A, ink, 1.6, 0.7);

    [[S.O, 'O', ink], [S.G, 'G', ink], [S.N, 'N', rule], [S.Ho, 'H', ink], [S.I, 'I', pencil]]
      .forEach(function (t) { dot(t[0], t[2], 3, 0.9); tag(t[0], t[1], t[2], 0.8); });

    [[S.A, 'A'], [S.B, 'B'], [S.C, 'C']].forEach(function (t) {
      dot(t[0], ink, 3.5, 0.95); tag(t[0], t[1], ink, 0.9);
    });

    ctx.globalAlpha = 1;
  }

  function step(t) {
    verts.forEach(function (v) {
      const h = home(v, t);
      v.x += (h.x - v.x) * 0.02;
      v.y += (h.y - v.y) * 0.02;
    });
    if (mouse.active) {
      let best = null, bd = Infinity;
      verts.forEach(function (v) {
        const d = dist(v, mouse);
        if (d < bd) { bd = d; best = v; }
      });
      if (best && bd < Math.max(W, H) * 0.5) {
        best.x += (mouse.x - best.x) * 0.06;
        best.y += (mouse.y - best.y) * 0.06;
      }
    }
    draw(bctx, 1);      // behind the sheet, full strength
    draw(fctx, 0.22);   // over the sheet, faint, like tracing paper
  }

  verts.forEach(function (v) { const h = home(v, 0); v.x = h.x; v.y = h.y; });

  if (reduced) {
    step(0);
    window.addEventListener('resize', function () { step(0); });
  } else {
    (function frame(t) { step(t); requestAnimationFrame(frame); })(0);
  }
})();
