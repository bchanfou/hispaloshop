import '@testing-library/jest-dom';

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', { value: vi.fn(), writable: true, configurable: true });

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(callback: any) {}
}
Object.defineProperty(window, 'IntersectionObserver', { value: MockIntersectionObserver, writable: true, configurable: true });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
