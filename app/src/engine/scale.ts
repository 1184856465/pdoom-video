// Output resolution multiplier, read once from the page URL (`?scale=2` renders 3840x2160,
// `?scale=0.6667` renders 1280x720). Scenes keep laying out in logical 1920x1080 px; the
// engine renders at SCALE x that.
// Kept in its own module so glsl/common.ts can use it without an import cycle through gl.ts.
//
// Muse adaptation: fractional scales (< 1) are allowed, down to 0.25. The requested scale is
// quantized so that 1920 * SCALE is an integer pixel count (1920 * SCALE -> PW in gl.ts),
// which keeps every physical-size computation (render targets, readback buffers, the
// exporter's frame size) exact. Call sites that assume SCALE > 1 (GLSL branch selection
// in common.ts / post.ts, the adaptive-sampling block size in engine.ts) treat
// SCALE <= 1 with the plain 1x code path instead.
function readScale() {
  if (typeof location === 'undefined') return 1;
  const raw = Number(new URLSearchParams(location.search).get('scale') ?? '1');
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const s = Math.min(4, Math.max(0.25, raw));
  return Math.round(1920 * s) / 1920;
}

/** Physical pixels per logical pixel of the output (0.25..4, default 1; PW/PH are integers). */
export const SCALE = readScale();

/** Format SCALE as a GLSL float literal with full precision (e.g. 1 -> "1.0", 2/3 -> "0.666667"). */
export const SCALE_GLSL = Number.isInteger(SCALE) ? SCALE.toFixed(1) : SCALE.toFixed(6);
