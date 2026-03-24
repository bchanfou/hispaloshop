// ── Cloudinary responsive-image helpers ──────────────────────────────────────
// Only transform URLs that live on res.cloudinary.com; for any other host the
// helpers return `undefined` so the caller can fall back to the raw `src`.
//
// Presets for common sizes — use these in components for optimal LCP/bandwidth.

const CLOUDINARY_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/;

/**
 * Insert Cloudinary transforms (e.g. "w_800,f_auto,q_auto") into a URL.
 * Returns `undefined` for non-Cloudinary URLs.
 */
export function getCloudinaryUrl(url, transforms) {
  if (!url || typeof url !== 'string') return undefined;
  const match = url.match(CLOUDINARY_RE);
  if (!match) return undefined;
  const [, base, rest] = match;
  return `${base}${transforms}/${rest}`;
}

/**
 * Build an `srcSet` string for the given widths.
 * Returns `undefined` for non-Cloudinary URLs → no conditional logic needed.
 */
export function getCloudinarySrcSet(url, widths = [400, 800, 1200]) {
  if (!url || typeof url !== 'string') return undefined;
  if (!CLOUDINARY_RE.test(url)) return undefined;
  return widths
    .map((w) => `${getCloudinaryUrl(url, `w_${w},f_auto,q_auto`)} ${w}w`)
    .join(', ');
}

/**
 * Same as getCloudinarySrcSet but forces WebP format explicitly.
 */
export function getCloudinaryWebPSrcSet(url, widths = [400, 800, 1200]) {
  if (!url || typeof url !== 'string') return undefined;
  if (!CLOUDINARY_RE.test(url)) return undefined;
  return widths
    .map((w) => `${getCloudinaryUrl(url, `w_${w},f_webp,q_auto`)} ${w}w`)
    .join(', ');
}

/**
 * Convenience: returns { src, srcSet } ready to spread on an <img>.
 * For non-Cloudinary URLs, srcSet will be undefined (harmless).
 */
export function getCloudinaryOptimized(url, { widths = [400, 800, 1200] } = {}) {
  return {
    src: getCloudinaryUrl(url, 'f_auto,q_auto') || url,
    srcSet: getCloudinarySrcSet(url, widths),
  };
}

// ── Size-optimized presets ───────────────────────────────────────────────────
// Use these in components for optimal bandwidth + LCP.

/** Feed post image (800px wide, quality 78) */
export const feedImg = (url) => getCloudinaryUrl(url, 'w_800,q_78,f_auto,dpr_auto') || url;

/** Product card thumbnail (400px wide, quality 72) */
export const thumbImg = (url) => getCloudinaryUrl(url, 'w_400,q_72,f_auto') || url;

/** Avatar (120x120 crop, quality 85) */
export const avatarImg = (url) => getCloudinaryUrl(url, 'w_120,h_120,c_fill,q_85,f_auto') || url;

/** Cover / hero (1200px wide, quality 75) */
export const coverImg = (url) => getCloudinaryUrl(url, 'w_1200,q_75,f_auto') || url;

/** Profile grid thumbnail (300x300 crop, quality 72) */
export const gridImg = (url) => getCloudinaryUrl(url, 'w_300,h_300,c_fill,q_72,f_auto') || url;
