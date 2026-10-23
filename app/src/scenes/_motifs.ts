// Shared motifs used by several plates so they look identical everywhere:
//  - the SPARK: orange point with white-hot core, glow, and sputtering particles
//  - the MASK: Muse (Jolly) drawn in the video's own idiom — a cream/bone disc
//    with a short-hatched fuzzy rim, two big glossy black eyes, a small curved
//    smile, and ember halftone blush dots (no new hue: the pink blush of the
//    reference avatar is translated into the palette's signal/ember orange).
//    It occupies the exact slot (disc silhouette, eye/smile positions) of the
//    original bland "assistant smile", so terrain/rolling scenes that depend
//    on the silhouette are unaffected.
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { hash, TAU } from '../engine/util';

type P2 = { x: number; y: number };

/**
 * Sputtering particles for a spark whose head position over time is `headAt(t)`.
 * Deterministic: particles are born at fixed times (rate per second) with hashed velocities.
 * A rate that changes over time is a function of the birth time with its maximum `rateMax`: particles
 * are then born on the constant rateMax clock and thinned by hash, so each one keeps its identity
 * whatever t it is drawn at (a rate read at the current t would re-time them all from one
 * motion-blur sub-frame to the next).
 * Draws into a 2D LineBatch as short streaks (motion-blurred), additive.
 */
export function sparkParticles(lb: LineBatch, t: number, headAt: (t: number) => P2 | null, o: { rate?: number | ((tb: number) => number); rateMax?: number; life?: number; speed?: number; gravity?: number; intensity?: number; seed?: number; width?: number } = {}) {
  const life = o.life ?? 0.45, speed = o.speed ?? 260, g = o.gravity ?? 520, I = o.intensity ?? 1, seed = o.seed ?? 1;
  const rateAt = typeof o.rate === 'function' ? o.rate : null;
  const rate = rateAt ? o.rateMax! : (o.rate as number | undefined) ?? 90;
  if (!(rate > 0)) return;
  const n0 = Math.floor((t - life) * rate), n1 = Math.floor(t * rate);
  for (let n = n0; n <= n1; n++) {
    const tb = n / rate;
    if (tb > t) continue;
    if (rateAt && hash(n, seed + 3) * rate >= rateAt(tb)) continue;
    const age = t - tb;
    const h = headAt(tb);
    if (!h) continue;
    const a = hash(n, seed) * TAU, sp = speed * (0.25 + hash(n, seed + 1) ** 2 * 1.2);
    const lf = life * (0.35 + 0.65 * hash(n, seed + 2));
    if (age > lf) continue;
    const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp - speed * 0.3;
    const x = h.x + vx * age, y = h.y + vy * age + 0.5 * g * age * age;
    const dtb = 0.018; // streak length in time
    const x0 = h.x + vx * Math.max(0, age - dtb), y0 = h.y + vy * Math.max(0, age - dtb) + 0.5 * g * Math.max(0, age - dtb) ** 2;
    const k = 1 - age / lf;
    const heat = k * k;
    const col: [number, number, number] = [
      (LIN.signal[0] + (1 - LIN.signal[0]) * heat) * 2.2 * I,
      (LIN.signal[1] + (0.8 - LIN.signal[1]) * heat) * 2.2 * I,
      (LIN.signal[2] + (0.5 - LIN.signal[2]) * heat) * 2.2 * I,
    ];
    lb.seg2(x0, y0, x, y, (o.width ?? 1.6) * (0.5 + k * 0.7), col, Math.min(1, k * 1.4));
  }
}

/** The spark head: a white-hot core and an orange halo (draw after the line it drags). 2D LineBatch. */
export function sparkHead(lb: LineBatch, x: number, y: number, t: number, scale = 1, intensity = 1) {
  const flick = 0.85 + 0.15 * Math.sin(t * 91.7) * Math.sin(t * 57.3);
  const I = intensity * flick;
  // halo: a few concentric short segments (dots) with decreasing intensity
  lb.seg2(x, y, x + 0.01, y, 26 * scale, [LIN.signal[0] * 0.5 * I, LIN.signal[1] * 0.5 * I, LIN.signal[2] * 0.5 * I], 0.35);
  lb.seg2(x, y, x + 0.01, y, 12 * scale, [LIN.ember[0] * 2.5 * I, LIN.ember[1] * 2.5 * I, LIN.ember[2] * 2.5 * I], 0.8);
  lb.seg2(x, y, x + 0.01, y, 5 * scale, [6 * I, 5 * I, 4 * I], 1);
  // four tiny rays
  for (let i = 0; i < 4; i++) {
    const a = i * (TAU / 4) + t * 3 + 0.4;
    const r = (9 + 5 * hash(Math.floor(t * 30), i)) * scale;
    lb.seg2(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, 1.2 * scale, [3 * I, 1.2 * I, 0.4 * I], 0.8);
  }
}

/** Canvas2D version of the spark head (for scenes drawing in 2D layers). Use with additive-ish bloom. */
export function sparkHead2D(c: CanvasRenderingContext2D, x: number, y: number, t: number, scale = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, 22 * scale);
  g.addColorStop(0, 'rgba(255,250,240,1)');
  g.addColorStop(0.18, 'rgba(255,170,90,0.95)');
  g.addColorStop(0.45, rgba('signal', 0.45));
  g.addColorStop(1, rgba('signal', 0));
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, 22 * scale, 0, TAU); c.fill();
}

// ---------------------------------------------------------------- the mask
/**
 * Canonical mask geometry in units of the disc radius R (centre at 0,0, y down):
 * disc radius 1; eyes: glossy dots at (±0.30, -0.16) radius 0.105 (enlarged from
 * the original 0.075 for Muse's bigger round eyes — centres unchanged, so the
 * leftturn terrain craters and the shoggoth SDF keep their layout);
 * smile: arc centred (0, -0.08) radius 0.50 from 25° to 155° (y-down angles), stroke 0.06;
 * cheeks (Muse blush): halftone dot patches centred (±0.52, +0.17), radius ~0.17.
 */
export const MASK = { eyeX: 0.30, eyeY: -0.16, eyeR: 0.105, smileCY: -0.08, smileR: 0.5, smileA0: (25 * Math.PI) / 180, smileA1: (155 * Math.PI) / 180, smileW: 0.06, cheekX: 0.52, cheekY: 0.17, cheekR: 0.17 };

/** Draw Muse's face on Canvas2D at (x,y) with radius R and rotation `rot`. */
export function drawMask2D(c: CanvasRenderingContext2D, x: number, y: number, R: number, rot = 0, o: { face?: string; ink?: string; alpha?: number } = {}) {
  c.save();
  c.translate(x, y); c.rotate(rot);
  c.globalAlpha *= o.alpha ?? 1;
  const face = o.face ?? rgba('bone'), ink = o.ink ?? rgba('ink');
  // fuzzy rim: one ring of short radial hatch strokes just outside the disc,
  // deterministic lengths (hash-seeded, so identical in preview and export)
  c.strokeStyle = face; c.lineCap = 'round';
  const NF = 96;
  for (let i = 0; i < NF; i++) {
    const a = (i / NF) * TAU + (hash(i, 71) - 0.5) * 0.05;
    const len = R * (0.035 + 0.05 * hash(i, 72));
    c.lineWidth = R * 0.017;
    c.beginPath();
    c.moveTo(Math.cos(a) * R * 0.985, Math.sin(a) * R * 0.985);
    c.lineTo(Math.cos(a) * (R + len), Math.sin(a) * (R + len));
    c.stroke();
  }
  // face plate
  c.fillStyle = face;
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  // blush: ember halftone dots on both cheeks, clipped to the disc
  c.save();
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
  c.fillStyle = rgba('ember', 0.8);
  const sp = R * 0.062, dr = R * 0.02;
  for (const s of [-1, 1]) {
    const cx = s * MASK.cheekX * R, cy = MASK.cheekY * R;
    for (let gx = -3; gx <= 3; gx++) for (let gy = -3; gy <= 3; gy++) {
      const dx = gx * sp + (gy % 2 ? sp / 2 : 0), dy = gy * sp * 0.87;
      if ((dx * dx + dy * dy) > (MASK.cheekR * R) ** 2) continue;
      c.beginPath(); c.arc(cx + dx, cy + dy, dr, 0, TAU); c.fill();
    }
  }
  c.restore();
  // eyes: big glossy black rounds with a bone highlight in the upper left
  for (const s of [-1, 1]) {
    const ex = s * MASK.eyeX * R, ey = MASK.eyeY * R, er = MASK.eyeR * R;
    c.fillStyle = ink;
    c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fill();
    c.fillStyle = rgba('bone', 0.92);
    c.beginPath(); c.arc(ex - er * 0.34, ey - er * 0.36, er * 0.30, 0, TAU); c.fill();
  }
  // smile
  c.strokeStyle = ink;
  c.lineWidth = MASK.smileW * R; c.lineCap = 'round';
  c.beginPath(); c.arc(0, MASK.smileCY * R, MASK.smileR * R, MASK.smileA0, MASK.smileA1); c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- Muse, full body
/**
 * Muse's full-body 2D character (the approved character sheet, redrawn as code):
 * a tall cream-furred body (head and torso one piece, width : height ≈ 0.78 : 1)
 * with a wide rounded-rectangle face plate set into its upper half, two black
 * round eyes with dot highlights, a small curved mouth, ember halftone blush,
 * short arms hanging at its sides and two stubby feet.
 *
 * Anchor: (x, y) is the CENTRE of the body; `h` is the full height in px
 * (feet bottom at y + h/2, crown at y - h/2). `o.rot` rotates about that centre,
 * so a caller that used to spin the mask disc about its centre can pass the
 * same angle and centre unchanged. Deterministic: all fur is hash-seeded.
 */
export interface MuseCharOpts {
  rot?: number;
  mouth?: 'smile' | 'frown' | 'open';
  /** Blush strength 0..1 (default 1). */
  blush?: number;
  alpha?: number;
  /** Fill overrides (defaults: warm creams just off bone, per the sheet). */
  body?: string;
  face?: string;
  ink?: string;
}

type Pt = [number, number];
const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

/** Body outline in unit space (height 1, centre 0,0, y down): right half top→bottom, then the mirrored left half back up. */
function museOutline(): Pt[] {
  const right: [Pt, Pt, Pt, Pt][] = [
    [[0, -0.5], [0.2, -0.505], [0.345, -0.44], [0.385, -0.3]],
    [[0.385, -0.3], [0.405, -0.2], [0.4, -0.02], [0.395, 0.14]],
    [[0.395, 0.14], [0.39, 0.3], [0.355, 0.405], [0.26, 0.445]],
    [[0.26, 0.445], [0.18, 0.472], [0.08, 0.478], [0, 0.478]],
  ];
  const pts: Pt[] = [];
  for (const seg of right) for (let i = 0; i < 22; i++) pts.push(cubic(seg[0], seg[1], seg[2], seg[3], i / 22));
  pts.push([0, 0.478]);
  for (let i = pts.length - 2; i >= 0; i--) pts.push([-pts[i]![0], pts[i]![1]]);
  return pts;
}

function rrectPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

export function drawMuseChar2D(c: CanvasRenderingContext2D, x: number, y: number, h: number, o: MuseCharOpts = {}) {
  const body = o.body ?? '#EFE7D6';
  const face = o.face ?? '#FAF4E6';
  const ink = o.ink ?? rgba('ink');
  const outline = museOutline();
  c.save();
  c.translate(x, y); c.rotate(o.rot ?? 0); c.scale(h, h);
  c.globalAlpha *= o.alpha ?? 1;
  c.lineJoin = 'round'; c.lineCap = 'round';

  // feet: two stubby rounded feet peeking out at the bottom
  for (const s of [-1, 1]) {
    c.beginPath(); c.ellipse(s * 0.185, 0.452, 0.128, 0.05, 0, 0, TAU);
    c.fillStyle = body; c.fill();
    c.save(); c.globalAlpha *= 0.45; c.strokeStyle = ink; c.lineWidth = 0.007; c.stroke(); c.restore();
  }
  // arms: short capsules hanging at the sides, slightly overlapping the body
  for (const s of [-1, 1]) {
    c.save();
    c.translate(s * 0.4, 0.1); c.rotate(s * -0.1);
    c.beginPath(); c.ellipse(0, 0, 0.072, 0.185, 0, 0, TAU);
    c.fillStyle = body; c.fill();
    c.save(); c.globalAlpha *= 0.45; c.strokeStyle = ink; c.lineWidth = 0.007; c.stroke(); c.restore();
    c.restore();
  }
  // fuzzy rim: short outward ticks along the outline (hash lengths, deterministic)
  c.strokeStyle = body;
  const NF = outline.length;
  for (let i = 0; i < NF; i += 1) {
    const p = outline[i]!, q = outline[(i + 1) % NF]!, p0 = outline[(i + NF - 1) % NF]!;
    let nx = q[1] - p0[1], ny = -(q[0] - p0[0]);
    const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    if (nx * p[0] + ny * p[1] < 0) { nx = -nx; ny = -ny; }
    const len = 0.012 + 0.016 * hash(i, 131);
    c.lineWidth = 0.0085;
    c.beginPath();
    c.moveTo(p[0] * 0.995, p[1] * 0.995);
    c.lineTo(p[0] + nx * len, p[1] + ny * len);
    c.stroke();
  }
  // body fill + silhouette line
  c.beginPath();
  outline.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath();
  c.fillStyle = body; c.fill();
  c.save(); c.globalAlpha *= 0.5; c.strokeStyle = '#6B6257'; c.lineWidth = 0.006; c.stroke(); c.restore();
  // sparse inner fur ticks (skip none: the face plate is drawn over them)
  c.save();
  c.beginPath();
  outline.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath(); c.clip();
  c.strokeStyle = '#8A7F6E';
  for (let i = 0; i < 110; i++) {
    const op = outline[Math.floor(hash(i, 141) * NF)]!;
    const k = 0.12 + 0.78 * hash(i, 142);
    const px = op[0] * k, py = op[1] * k - 0.01;
    const a = hash(i, 143) * TAU, ln = 0.011 + 0.012 * hash(i, 144);
    c.save(); c.globalAlpha *= 0.16 + 0.12 * hash(i, 145); c.lineWidth = 0.005;
    c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * ln, py + Math.sin(a) * ln); c.stroke();
    c.restore();
  }
  c.restore();

  // face plate: wide rounded rectangle in the upper body, a shade lighter than the fur
  const FW = 0.6, FH = 0.4, FX = -FW / 2, FY = -0.445;
  rrectPath(c, FX, FY, FW, FH, 0.165);
  c.fillStyle = face; c.fill();
  c.save(); c.globalAlpha *= 0.55; c.strokeStyle = ink; c.lineWidth = 0.007; c.stroke(); c.restore();

  // blush: ember halftone dots on both cheeks, clipped to the face plate
  const bl = o.blush ?? 1;
  if (bl > 0) {
    c.save();
    rrectPath(c, FX, FY, FW, FH, 0.165); c.clip();
    c.fillStyle = rgba('ember', 0.8 * bl);
    const sp = 0.027, dr = 0.0088, cyy = -0.185;
    for (const s of [-1, 1]) {
      const cx = s * 0.222;
      for (let gx = -3; gx <= 3; gx++) for (let gy = -3; gy <= 3; gy++) {
        const dx = gx * sp + (gy % 2 ? sp / 2 : 0), dy = gy * sp * 0.87;
        if (dx * dx + dy * dy > 0.075 * 0.075) continue;
        c.beginPath(); c.arc(cx + dx, cyy + dy, dr, 0, TAU); c.fill();
      }
    }
    c.restore();
  }
  // eyes: black rounds with a small dot highlight (upper left), per the reference photos
  for (const s of [-1, 1]) {
    const ex = s * 0.145, ey = -0.272, er = 0.0325;
    c.fillStyle = ink;
    c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,252,246,0.95)';
    c.beginPath(); c.arc(ex - er * 0.34, ey - er * 0.36, er * 0.3, 0, TAU); c.fill();
  }
  // mouth: a small arc; frown flips it, open is a small filled oval
  c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 0.011;
  const mouth = o.mouth ?? 'smile';
  if (mouth === 'smile') {
    c.beginPath(); c.arc(0, -0.245, 0.046, (15 * Math.PI) / 180, (165 * Math.PI) / 180); c.stroke();
  } else if (mouth === 'frown') {
    c.beginPath(); c.arc(0, -0.165, 0.046, (195 * Math.PI) / 180, (345 * Math.PI) / 180); c.stroke();
  } else {
    c.beginPath(); c.ellipse(0, -0.2, 0.026, 0.019, 0, 0, TAU); c.fill();
  }
  c.restore();
}

/** GLSL: signed distance to the mask's ink features (eyes + smile) in mask units (p / R, y DOWN). */
export const GLSL_MASK = /* glsl */ `
float sdMaskInk(vec2 p) {
  float e = min(length(p - vec2(-${MASK.eyeX}, ${MASK.eyeY})), length(p - vec2(${MASK.eyeX}, ${MASK.eyeY}))) - ${MASK.eyeR};
  vec2 q = p - vec2(0.0, ${MASK.smileCY});
  float a = atan(q.y, q.x);
  float a0 = ${MASK.smileA0.toFixed(5)}, a1 = ${MASK.smileA1.toFixed(5)};
  float s;
  if (a > a0 && a < a1) s = abs(length(q) - ${MASK.smileR}) - ${(MASK.smileW / 2).toFixed(4)};
  else {
    vec2 c0 = vec2(cos(a0), sin(a0)) * ${MASK.smileR}, c1 = vec2(cos(a1), sin(a1)) * ${MASK.smileR};
    s = min(length(q - c0), length(q - c1)) - ${(MASK.smileW / 2).toFixed(4)};
  }
  return min(e, s);
}`;
