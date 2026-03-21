import { renderHook } from '@testing-library/react';
import { useHaptics } from './useHaptics';

describe('useHaptics', () => {
  beforeEach(() => {
    vi.mocked(navigator.vibrate).mockClear();
  });

  it('triggers light pattern (10ms)', () => {
    const { result } = renderHook(() => useHaptics());
    result.current.trigger('light');
    expect(navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it('triggers medium pattern (25ms)', () => {
    const { result } = renderHook(() => useHaptics());
    result.current.trigger('medium');
    expect(navigator.vibrate).toHaveBeenCalledWith(25);
  });

  it('triggers heavy pattern (50ms)', () => {
    const { result } = renderHook(() => useHaptics());
    result.current.trigger('heavy');
    expect(navigator.vibrate).toHaveBeenCalledWith(50);
  });

  it('triggers success pattern [10, 50, 10]', () => {
    const { result } = renderHook(() => useHaptics());
    result.current.trigger('success');
    expect(navigator.vibrate).toHaveBeenCalledWith([10, 50, 10]);
  });

  it('triggers error pattern [50, 30, 50, 30, 50]', () => {
    const { result } = renderHook(() => useHaptics());
    result.current.trigger('error');
    expect(navigator.vibrate).toHaveBeenCalledWith([50, 30, 50, 30, 50]);
  });
});
