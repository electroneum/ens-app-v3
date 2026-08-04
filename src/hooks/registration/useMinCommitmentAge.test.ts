import { mockFunction, renderHook } from '@app/test-utils'

import { type Address } from 'viem'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReadContract } from 'wagmi'

import { useContractAddress } from '@app/hooks/chain/useContractAddress'

import { useMinCommitmentAge } from './useMinCommitmentAge'

vi.mock('wagmi')
vi.mock('@app/hooks/chain/useContractAddress')

const mockUseReadContract = mockFunction(useReadContract)
const mockUseContractAddress = mockFunction(useContractAddress)

const ETH_REGISTRAR_CONTROLLER = '0x000000000000000000000000000000000000c0c0' as Address

describe('useMinCommitmentAge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseContractAddress.mockReturnValue(ETH_REGISTRAR_CONTROLLER)
    mockUseReadContract.mockReturnValue({ data: 60n, isLoading: false } as any)
  })

  it('reads `minCommitmentAge` on the ETHRegistrarController', () => {
    renderHook(() => useMinCommitmentAge())

    expect(mockUseReadContract).toHaveBeenCalledTimes(1)
    const call = mockUseReadContract.mock.calls[0]?.[0]
    expect(call?.address).toBe(ETH_REGISTRAR_CONTROLLER)
    expect(call?.functionName).toBe('minCommitmentAge')
    expect(call?.query?.enabled).toBe(true)
  })

  it('returns the on-chain value as bigint data', () => {
    mockUseReadContract.mockReturnValue({ data: 300n, isLoading: false } as any)
    const { result } = renderHook(() => useMinCommitmentAge())
    expect(result.current.data).toBe(300n)
  })

  it('disables the query when the controller address is missing', () => {
    mockUseContractAddress.mockReturnValue('' as unknown as Address)

    renderHook(() => useMinCommitmentAge())

    const call = mockUseReadContract.mock.calls[0]?.[0]
    expect(call?.query?.enabled).toBe(false)
  })
})
