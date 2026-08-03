import { mockFunction, renderHook, waitFor } from '@app/test-utils'

import { describe, expect, it, vi } from 'vitest'
import { useChainId } from 'wagmi'

import { KNOWN_RESOLVER_DATA } from '@app/constants/resolverAddressData'
import { RESOLVER_INTERFACE_IDS, ResolverInterfaceName } from '@app/constants/resolverInterfaceIds'
import { useResolverHasInterfaces } from '@app/hooks/useResolverHasInterfaces'

// These fixtures are keyed off the mainnet (chainId 1) KNOWN_RESOLVER_DATA table, so
// useChainId must report mainnet here regardless of the app's active chain elsewhere.
vi.mock('wagmi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('wagmi')>()),
  useChainId: vi.fn(),
}))
mockFunction(useChainId).mockReturnValue(1)

const ResolverAddresses = KNOWN_RESOLVER_DATA[1]!

const interfaceIdToName = (interfaceId: string) =>
  Object.entries(RESOLVER_INTERFACE_IDS).find(
    ([, value]) => value === interfaceId,
  )![0] as ResolverInterfaceName

describe('useResolverHasInterfaces', () => {
  ResolverAddresses.forEach((item) => {
    it(`should return true for known resolver address: ${item.address}`, async () => {
      const { result } = renderHook(() =>
        useResolverHasInterfaces({
          interfaceNames: item.supportedInterfaces.map(interfaceIdToName),
          resolverAddress: item.address,
        }),
      )
      await waitFor(() => !result.current.isLoading)
      expect(result.current.data).toEqual(item.supportedInterfaces.map(() => true))
    })
  })
})
