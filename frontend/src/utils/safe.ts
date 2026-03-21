export function asText(value: any, fallback: string = ''): string {
  if (value == null) return fallback;
  return String(value);
}

export function asLowerText(value: any): string {
  return asText(value).toLowerCase();
}

export function firstToken(value: any, fallback: string = ''): string {
  const text = asText(value).trim();
  if (!text) return fallback;
  const parts = text.split(/\s+/);
  return parts[0] || fallback;
}

export function asNumber(value: any, fallback: number = 0): number {
  if (value === '' || value === null || value === undefined) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function asBool(value: any, fallback: boolean = false): boolean {
  if (value === true || value === 'true' || value === 1) return true;
  if (value === false || value === 'false' || value === 0) return false;
  return fallback;
}

export function asArray<T>(value: T | T[] | null | undefined, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value;
  if (value == null) return fallback;
  return [value];
}
