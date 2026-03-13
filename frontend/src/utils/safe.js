export function asText(value, fallback = '') {
  if (value == null) return fallback;
  return String(value);
}

export function asLowerText(value) {
  return asText(value).toLowerCase();
}

export function firstToken(value, fallback = '') {
  const text = asText(value).trim();
  if (!text) return fallback;
  const parts = text.split(/\s+/);
  return parts[0] || fallback;
}

export function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
