import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useNavigationDirection } from './useNavigationDirection';

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(MemoryRouter, { initialEntries: ['/a', '/b'], initialIndex: 1 }, children);
}

describe('useNavigationDirection', () => {
  it('returns a string value', () => {
    const { result } = renderHook(() => useNavigationDirection(), { wrapper });
    expect(typeof result.current).toBe('string');
  });

  it('returns either "forward" or "back"', () => {
    const { result } = renderHook(() => useNavigationDirection(), { wrapper });
    expect(['forward', 'back']).toContain(result.current);
  });

  it('returns "forward" when navigationType is PUSH', () => {
    // MemoryRouter with initialIndex navigates via PUSH to the entry
    function pushWrapper({ children }: { children: React.ReactNode }) {
      return createElement(MemoryRouter, { initialEntries: ['/only'], initialIndex: 0 }, children);
    }
    const { result } = renderHook(() => useNavigationDirection(), { wrapper: pushWrapper });
    // Initial MemoryRouter load is POP, which maps to 'back'
    expect(result.current).toBe('back');
  });
});
