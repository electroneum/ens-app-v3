import { Hash } from 'viem'
import { getBlock } from 'viem/actions'

import { ClientWithEns } from '@app/types'

type GetBlockMetadataByTimestampParameters = {
  timestamp: bigint
}

type FoundBlockReturnType = {
  hash: Hash
  number: number
  timestamp: number
  parentHash: Hash
}

type BlockErrorReturnType = {
  error: string
}

type GetBlockMetadataByTimestampReturnType =
  | {
      ok: true
      data: FoundBlockReturnType
    }
  | {
      ok: false
      data: BlockErrorReturnType
    }

// 2^64 blocks is far beyond any chain height, so 64 iterations
// guarantees the binary search always converges
const MAX_ITERATIONS = 64

// Finds the earliest block with a timestamp >= the given timestamp by binary
// searching over block numbers via the client (replaces findblock.xyz, which
// does not index Electroneum)
export const getBlockMetadataByTimestamp = async (
  client: ClientWithEns,
  { timestamp }: GetBlockMetadataByTimestampParameters,
): Promise<GetBlockMetadataByTimestampReturnType> => {
  try {
    const latestBlock = await getBlock(client, { blockTag: 'latest' })
    if (latestBlock.timestamp < timestamp)
      return {
        ok: false,
        data: { error: `No block found after timestamp ${timestamp}` },
      }

    let low = 1n
    let high = latestBlock.number
    let foundBlock = latestBlock

    for (let i = 0; i < MAX_ITERATIONS && low <= high; i += 1) {
      const mid = (low + high) / 2n
      // eslint-disable-next-line no-await-in-loop
      const block = await getBlock(client, { blockNumber: mid })
      if (block.timestamp >= timestamp) {
        foundBlock = block
        high = mid - 1n
      } else {
        low = mid + 1n
      }
    }

    return {
      ok: true,
      data: {
        hash: foundBlock.hash,
        number: Number(foundBlock.number),
        timestamp: Number(foundBlock.timestamp),
        parentHash: foundBlock.parentHash,
      },
    }
  } catch (error) {
    return {
      ok: false,
      data: { error: error instanceof Error ? error.message : 'Failed to fetch block' },
    }
  }
}
