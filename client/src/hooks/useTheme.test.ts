import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from './useTheme';

const prefersDark = (matches: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('useTheme', () => {
  it('follows the OS preference when the user has not chosen', () => {
    prefersDark(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('remembers an explicit choice over the OS preference', () => {
    prefersDark(true);
    const { result, unmount } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(document.documentElement.dataset.theme).toBe('light');
    unmount();

    const { result: next } = renderHook(() => useTheme());
    expect(next.current.theme).toBe('light');
  });

  it('still works when storage is unavailable (e.g. private mode)', () => {
    prefersDark(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
  });
});
