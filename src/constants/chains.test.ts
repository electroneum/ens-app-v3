import { localhost } from 'viem/chains'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  electroneumWithEns,
  getChainsFromUrl,
  getNetworkFromUrl,
  getSupportedChainById,
  localhostWithEns,
} from './chains'

// Store original values
const originalWindow = global.window
const originalEnv = process.env

// Create a mock location object
const createMockLocation = (hostname: string) => ({
  hostname,
  href: `https://${hostname}`,
  origin: `https://${hostname}`,
  protocol: 'https:',
  host: hostname,
  pathname: '/',
  search: '',
  hash: '',
})

describe('chains', () => {
  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_CHAIN_NAME
    delete process.env.NEXT_PUBLIC_PROVIDER
    
    // Set up window mock
    Object.defineProperty(global, 'window', {
      value: {
        location: createMockLocation('app.ens.domains'),
      },
      writable: true,
    })
  })

  afterEach(() => {
    // Restore original values
    global.window = originalWindow
    process.env = originalEnv
  })

  describe('getSupportedChainById', () => {
    it('should return electroneum chain for electroneum id', () => {
      const result = getSupportedChainById(electroneumWithEns.id)
      expect(result).toBe(electroneumWithEns)
    })

    it('should return localhost chain for localhost id', () => {
      const result = getSupportedChainById(localhost.id)
      expect(result).toBe(localhostWithEns)
    })

    it('should return undefined for unsupported chain id', () => {
      const result = getSupportedChainById(9999)
      expect(result).toBeUndefined()
    })

    it('should return undefined for undefined chain id', () => {
      const result = getSupportedChainById(undefined)
      expect(result).toBeUndefined()
    })
  })

  describe('getNetworkFromUrl', () => {
    it('should return undefined in server-side environment', () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      })
      const result = getNetworkFromUrl()
      expect(result).toBeUndefined()
    })

    describe('environment variable overrides', () => {
      it('should return sepolia when NEXT_PUBLIC_CHAIN_NAME is sepolia', () => {
        process.env.NEXT_PUBLIC_CHAIN_NAME = 'sepolia'
        const result = getNetworkFromUrl()
        expect(result).toBe('sepolia')
      })

      it('should return mainnet when NEXT_PUBLIC_CHAIN_NAME is mainnet', () => {
        process.env.NEXT_PUBLIC_CHAIN_NAME = 'mainnet'
        const result = getNetworkFromUrl()
        expect(result).toBe('mainnet')
      })
    })

    describe('hostname-based detection', () => {
      it('should return localhost for localhost with local provider', async () => {
        // Set up environment before importing
        process.env.NEXT_PUBLIC_PROVIDER = 'http://localhost:8545'
        // @ts-ignore
        global.window.location = createMockLocation('localhost')

        // Re-import the module to pick up the new environment variable
        vi.resetModules()
        const { getNetworkFromUrl: getNetworkFromUrlFresh } = await import('./chains')
        const result = getNetworkFromUrlFresh()
        expect(result).toBe('localhost')
      })

      it('should return electroneum for localhost without local provider', async () => {
        delete process.env.NEXT_PUBLIC_PROVIDER
        // @ts-ignore
        global.window.location = createMockLocation('localhost')

        // Re-import the module to pick up the cleared environment variable
        vi.resetModules()
        const { getNetworkFromUrl: getNetworkFromUrlFresh } = await import('./chains')
        const result = getNetworkFromUrlFresh()
        expect(result).toBe('electroneum')
      })

      it('should return localhost for 127.0.0.1 with local provider', async () => {
        process.env.NEXT_PUBLIC_PROVIDER = 'http://localhost:8545'
        // @ts-ignore
        global.window.location = createMockLocation('127.0.0.1')

        vi.resetModules()
        const { getNetworkFromUrl: getNetworkFromUrlFresh } = await import('./chains')
        const result = getNetworkFromUrlFresh()
        expect(result).toBe('localhost')
      })

      it('should return electroneum for 127.0.0.1 without local provider', async () => {
        delete process.env.NEXT_PUBLIC_PROVIDER
        // @ts-ignore
        global.window.location = createMockLocation('127.0.0.1')

        vi.resetModules()
        const { getNetworkFromUrl: getNetworkFromUrlFresh } = await import('./chains')
        const result = getNetworkFromUrlFresh()
        expect(result).toBe('electroneum')
      })

      it('should return electroneum for any other hostname', () => {
        // @ts-ignore
        global.window.location = createMockLocation('unknown.example.com')
        const result = getNetworkFromUrl()
        expect(result).toBe('electroneum')
      })
    })
  })

  describe('getChainsFromUrl', () => {
    it('should return electroneum chains as fallback for mainnet-labeled network', () => {
      // mainnet/sepolia support has been dropped; getChainsFromUrl falls back to electroneum
      // @ts-ignore
      global.window.location = createMockLocation('app.ens.domains')
      const result = getChainsFromUrl()
      expect(result).toEqual([electroneumWithEns])
    })

    it('should return electroneum chains as fallback for sepolia-labeled network', () => {
      // @ts-ignore
      global.window.location = createMockLocation('sepolia.ens.domains')
      const result = getChainsFromUrl()
      expect(result).toEqual([electroneumWithEns])
    })

    it('should return localhost chains for localhost network', async () => {
      process.env.NEXT_PUBLIC_PROVIDER = 'http://localhost:8545'
      // @ts-ignore
      global.window.location = createMockLocation('localhost')

      vi.resetModules()
      const { getChainsFromUrl: getChainsFromUrlFresh, localhostWithEns: localhostWithEnsFresh } = await import('./chains')
      const result = getChainsFromUrlFresh()
      expect(result).toEqual([localhostWithEnsFresh])
    })

    it('should return electroneum for undefined network', () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      })
      const result = getChainsFromUrl()
      expect(result).toMatchObject([electroneumWithEns])
    })
  })

  describe('chain configurations', () => {
    it('should have correct chain ids', () => {
      expect(localhostWithEns.id).toBe(localhost.id)
    })
  })
})