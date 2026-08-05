import { describe, expect, it } from 'vitest'

import renewNames from './renewNames'

const CONTROLLER = '0x0000000000000000000000000000000000000c01' as const
const BULK = '0x0000000000000000000000000000000000000b02' as const
const UNIVERSAL = '0x0000000000000000000000000000000000000a03' as const

const makeWallet = (contracts: Record<string, { address: `0x${string}` }>) =>
  ({ chain: { contracts } }) as any

const baseContracts = {
  ensEthRegistrarController: { address: CONTROLLER },
  ensBulkRenewal: { address: BULK },
}

describe('renewNames.makeFunctionData', () => {
  it('routes single renewals to wrappedRenewalWithReferrer when configured', () => {
    const wallet = makeWallet({
      ...baseContracts,
      wrappedRenewalWithReferrer: { address: UNIVERSAL },
    })

    const result = renewNames.makeFunctionData(wallet, {
      nameOrNames: 'test.etn',
      duration: 86400n,
      value: 100n,
    })

    expect(result.to).toBe(UNIVERSAL)
    expect(result.value).toBe(100n)
  })

  it('falls back to the controller for single renewals when not configured', () => {
    const wallet = makeWallet(baseContracts)

    const result = renewNames.makeFunctionData(wallet, {
      nameOrNames: 'test.etn',
      duration: 86400n,
      value: 100n,
    })

    expect(result.to).toBe(CONTROLLER)
  })

  it('routes bulk renewals to ensBulkRenewal', () => {
    const wallet = makeWallet({
      ...baseContracts,
      wrappedRenewalWithReferrer: { address: UNIVERSAL },
    })

    const result = renewNames.makeFunctionData(wallet, {
      nameOrNames: ['one.etn', 'two.etn'],
      duration: 86400n,
      value: 200n,
    })

    expect(result.to).toBe(BULK)
  })

  it('honours an explicit wrappedRenewalContract override', () => {
    const OVERRIDE = '0x00000000000000000000000000000000000000ff' as const
    const wallet = makeWallet({
      ...baseContracts,
      wrappedRenewalWithReferrer: { address: UNIVERSAL },
    })

    const result = renewNames.makeFunctionData(wallet, {
      nameOrNames: 'test.etn',
      duration: 86400n,
      value: 100n,
      wrappedRenewalContract: OVERRIDE,
    })

    expect(result.to).toBe(OVERRIDE)
  })
})
