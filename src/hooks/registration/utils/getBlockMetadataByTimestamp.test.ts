import { mockFunction } from '@app/test-utils'

import { getBlock } from 'viem/actions'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClientWithEns } from '@app/types'

import { getBlockMetadataByTimestamp } from './getBlockMetadataByTimestamp'

vi.mock('viem/actions')

const mockGetBlock = mockFunction(getBlock)

const client = {} as ClientWithEns

// simulates a chain with 5s block times: block n has timestamp 1000 + n * 5
const LATEST_BLOCK_NUMBER = 100n
const blockAt = (blockNumber: bigint) => ({
  hash: `0xhash-${blockNumber}`,
  number: blockNumber,
  timestamp: 1000n + blockNumber * 5n,
  parentHash: `0xhash-${blockNumber - 1n}`,
})

describe('getBlockMetadataByTimestamp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBlock.mockImplementation(async (_client, { blockNumber, blockTag }: any) => {
      if (blockTag === 'latest') return blockAt(LATEST_BLOCK_NUMBER)
      return blockAt(blockNumber)
    })
  })

  it('returns the block with an exactly matching timestamp', async () => {
    const result = await getBlockMetadataByTimestamp(client, { timestamp: 1000n + 42n * 5n })
    expect(result).toEqual({
      ok: true,
      data: {
        hash: '0xhash-42',
        number: 42,
        timestamp: Number(1000n + 42n * 5n),
        parentHash: '0xhash-41',
      },
    })
  })

  it('returns the earliest block at or after a timestamp between blocks', async () => {
    // between block 42 (1210) and block 43 (1215)
    const result = await getBlockMetadataByTimestamp(client, { timestamp: 1212n })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.number).toBe(43)
      expect(result.data.timestamp).toBe(Number(1000n + 43n * 5n))
    }
  })

  it('returns the first block for a timestamp before the chain start', async () => {
    const result = await getBlockMetadataByTimestamp(client, { timestamp: 0n })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.number).toBe(1)
  })

  it('returns the latest block for a timestamp equal to the latest block timestamp', async () => {
    const result = await getBlockMetadataByTimestamp(client, {
      timestamp: 1000n + LATEST_BLOCK_NUMBER * 5n,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.number).toBe(Number(LATEST_BLOCK_NUMBER))
  })

  it('returns an error when the timestamp is after the latest block', async () => {
    const timestamp = 1000n + (LATEST_BLOCK_NUMBER + 1n) * 5n
    const result = await getBlockMetadataByTimestamp(client, { timestamp })
    expect(result).toEqual({
      ok: false,
      data: { error: `No block found after timestamp ${timestamp}` },
    })
  })

  it('returns an error when getBlock throws', async () => {
    mockGetBlock.mockRejectedValue(new Error('rpc failure'))
    const result = await getBlockMetadataByTimestamp(client, { timestamp: 1200n })
    expect(result).toEqual({
      ok: false,
      data: { error: 'rpc failure' },
    })
  })

  it('uses a bounded number of getBlock calls', async () => {
    await getBlockMetadataByTimestamp(client, { timestamp: 1212n })
    // 1 latest block call + at most log2(100) ~ 7 binary search calls
    expect(mockGetBlock.mock.calls.length).toBeLessThanOrEqual(9)
  })
})
