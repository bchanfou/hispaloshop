import { renderHook } from '@testing-library/react';
import { useDwellTime } from './useDwellTime';

vi.mock('../services/api/client', () => ({
  __esModule: true,
  default: { post: vi.fn().mockResolvedValue({}) },
}));

describe('useDwellTime', () => {
  it('returns a ref object', () => {
    const { result } = renderHook(() => useDwellTime('post-1', 'post'));
    expect(result.current).toHaveProperty('current');
  });

  it('ref.current is initially null', () => {
    const { result } = renderHook(() => useDwellTime('post-1', 'post'));
    expect(result.current.current).toBeNull();
  });

  it('cleans up observer on unmount', () => {
    const disconnectSpy = vi.fn();
    const origIO = window.IntersectionObserver;

    // Must use a class (not arrow fn) because `new` is called on it
    window.IntersectionObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = disconnectSpy;
      root = null;
      rootMargin = '';
      thresholds = [];
      takeRecords() { return []; }
      constructor(_cb: any, _opts?: any) {}
    } as any;

    const div = document.createElement('div');
    const { unmount } = renderHook(() => {
      const ref = useDwellTime('post-1', 'post');
      ref.current = div;
      return ref;
    });

    unmount();
    expect(disconnectSpy).toHaveBeenCalled();

    window.IntersectionObserver = origIO;
  });
});
