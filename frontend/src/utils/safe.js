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
  if (value === '' || value === null || value === undefined) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function asBool(value, fallback = false) {
  if (value === true || value === 'true' || value === 1) return true;
  if (value === false || value === 'false' || value === 0) return false;
  return fallback;
}

export function asArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value == null) return fallback;
  return [value];
}
