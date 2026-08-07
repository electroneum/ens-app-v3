import { describe, expect, it } from 'vitest'

import { getReadableError } from './errors'

const NODE_MESSAGE =
  'err: insufficient funds for gas * price + value: address 0x1234567890AbcdEF1234567890aBcdef12345678 have 0 want 65328000000008'

describe('getReadableError', () => {
  it('maps a wallet-wrapped insufficient-funds error (non-viem shape)', () => {
    // MetaMask-style rewrap: outer error is a plain object with the node
    // message buried in the cause chain — previously fell through to the
    // generic "Missing or invalid parameters" banner
    const err = new Error('Missing or invalid parameters.')
    ;(err as any).cause = {
      code: -32602,
      message: 'Invalid parameters were provided to the RPC method.',
      cause: { message: NODE_MESSAGE },
    }

    const result = getReadableError(err)
    expect(result?.type).toBe('insufficientFunds')
    expect(result?.message).toContain('Wallet balance too low')
    expect(result?.message).toContain('0.000065328000000008')
  })

  it('maps a bare insufficient-funds message without the geth format', () => {
    const err = new Error('insufficient funds for transfer')

    const result = getReadableError(err)
    expect(result?.type).toBe('insufficientFunds')
    expect(result?.message).toContain('Not enough ETN')
  })

  it('returns null for unrelated errors', () => {
    expect(getReadableError(new Error('user rejected the request'))).toBeNull()
  })

  it('does not recurse forever on circular causes', () => {
    const err = new Error('some error') as any
    err.cause = err

    expect(getReadableError(err)).toBeNull()
  })
})
