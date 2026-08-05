import { encodeFunctionData, type Account, type Hex, type Transport } from 'viem'

import type { ChainWithEns, ClientWithAccount } from '@ensdomains/ensjs/contracts'
import { getChainContractAddress } from '@ensdomains/ensjs/contracts'
import { EMPTY_BYTES32 } from '@ensdomains/ensjs/utils'

/**
 * Override for ENS.js renewNames matching the Electroneum deployment.
 *
 * When the chain has a `wrappedRenewalWithReferrer` contract configured (the
 * UniversalRegistrarRenewalWithReferrer deployment), single renewals go
 * through it: it routes via NameWrapper.renew, which keeps wrapper expiry in
 * sync for wrapped names and is a wrapper no-op for unwrapped ones — so it is
 * the single safe renewal path for ALL names, and no wrapped-name branching
 * is needed. Bulk renewals go through `ensBulkRenewal`, which on Electroneum
 * mainnet is the same contract (its renewAll is wrapper-safe in the same way).
 *
 * When `wrappedRenewalWithReferrer` is absent (eg. testnet, where wrapping is
 * gated off via getChainSupportsNameWrapping), single renewals fall back to
 * ETHRegistrarController.renew(label, duration, referrer) — safe there because
 * no name can be wrapped.
 */

// UniversalRegistrarRenewalWithReferrer.renew and ETHRegistrarController.renew
// share this signature
const singleNameRenewalAbi = [
  {
    inputs: [
      { internalType: 'string', name: 'label', type: 'string' },
      { internalType: 'uint256', name: 'duration', type: 'uint256' },
      { internalType: 'bytes32', name: 'referrer', type: 'bytes32' },
    ],
    name: 'renew',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const

const bulkRenewalAbi = [
  {
    inputs: [
      { internalType: 'string[]', name: 'names', type: 'string[]' },
      { internalType: 'uint256', name: 'duration', type: 'uint256' },
      { internalType: 'bytes32', name: 'referrer', type: 'bytes32' },
    ],
    name: 'renewAll',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const

export type RenewNamesDataParameters = {
  /** Name or names to renew */
  nameOrNames: string | string[]
  /** Duration to renew name(s) for */
  duration: bigint | number
  /** Referrer data */
  referrer?: Hex
  /** Value of all renewals */
  value: bigint
  /** Whether the name(s) are wrapped — informational; routing does not branch
   * on it because the wrapper-aware renewal path is safe for all names */
  hasWrapped?: boolean
  /** Contract address for wrapped name renewals (optional override) */
  wrappedRenewalContract?: `0x${string}`
}

export type RenewNamesDataReturnType = {
  to: `0x${string}`
  data: Hex
  value: bigint
}

const getWrappedRenewalAddress = (chain: ChainWithEns): `0x${string}` | undefined =>
  (
    chain.contracts as Partial<
      Record<'wrappedRenewalWithReferrer', { address: `0x${string}` }>
    >
  ).wrappedRenewalWithReferrer?.address

export const makeFunctionData = <TChain extends ChainWithEns, TAccount extends Account | undefined>(
  wallet: ClientWithAccount<Transport, TChain, TAccount>,
  {
    nameOrNames,
    duration,
    referrer = EMPTY_BYTES32,
    value,
    wrappedRenewalContract,
  }: RenewNamesDataParameters,
): RenewNamesDataReturnType => {
  const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames]
  const labels = names.map((name) => name.split('.')[0])

  if (labels.length > 1) {
    return {
      to: getChainContractAddress({
        client: wallet,
        contract: 'ensBulkRenewal',
      }),
      data: encodeFunctionData({
        abi: bulkRenewalAbi,
        functionName: 'renewAll',
        args: [labels, BigInt(duration), referrer],
      }),
      value,
    }
  }

  const wrappedRenewalAddress =
    wrappedRenewalContract ?? getWrappedRenewalAddress(wallet.chain)

  return {
    to:
      wrappedRenewalAddress ??
      getChainContractAddress({
        client: wallet,
        contract: 'ensEthRegistrarController',
      }),
    data: encodeFunctionData({
      abi: singleNameRenewalAbi,
      functionName: 'renew',
      args: [labels[0], BigInt(duration), referrer],
    }),
    value,
  }
}

/**
 * Namespace pattern matching ENS.js structure
 * Allows calling renewNames.makeFunctionData(...)
 */
const renewNames = {
  makeFunctionData,
}

export default renewNames
