// ── Cloudinary responsive-image helpers ──────────────────────────────────────
// Only transform URLs that live on res.cloudinary.com; for any other host the
// helpers return `undefined` so the caller can fall back to the raw `src`.

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
