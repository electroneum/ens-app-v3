import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

// Node >= 25 ships its own `localStorage`/`sessionStorage` globals that are
// unavailable without --localstorage-file and shadow jsdom's implementations,
// so provide an in-memory Storage when the environment lacks a working one.
const makeMemoryStorage = (): Storage => {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(String(key), String(value))
    },
  }
}

for (const storageKey of ['localStorage', 'sessionStorage'] as const) {
  if (!window[storageKey]) {
    Object.defineProperty(window, storageKey, {
      value: makeMemoryStorage(),
      configurable: true,
    })
  }
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

beforeAll(() => {
  Object.defineProperty(window.HTMLInputElement.prototype, 'showPicker', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })
})
