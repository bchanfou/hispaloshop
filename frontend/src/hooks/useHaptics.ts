type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  error: [50, 30, 50, 30, 50],
};

export function useHaptics() {
  const trigger = (type: HapticType = 'light') => {
    try {
      if (navigator?.vibrate) navigator.vibrate(PATTERNS[type]);
    } catch {}
  };
  return { trigger };
}
