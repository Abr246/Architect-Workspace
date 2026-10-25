import { act, renderHook } from '@testing-library/react';
import { useTheme } from './useTheme';

function mockMatchMedia(prefersDark: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' && prefersDark,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to light when there is no stored preference and the system prefers light', () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useTheme());

    expect(result.current[0]).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('defaults to dark when there is no stored preference and the system prefers dark', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useTheme());

    expect(result.current[0]).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('a stored preference overrides the system preference', () => {
    mockMatchMedia(true);
    window.localStorage.setItem('goalkick-theme', 'light');

    const { result } = renderHook(() => useTheme());

    expect(result.current[0]).toBe('light');
  });

  it('toggling flips the theme, updates the DOM attribute, and persists the choice', () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('light');

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('goalkick-theme')).toBe('dark');

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('goalkick-theme')).toBe('light');
  });

  it('falls back to the system preference if localStorage throws (e.g. private browsing)', () => {
    mockMatchMedia(true);
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current[0]).toBe('dark');

    jest.restoreAllMocks();
  });
});
