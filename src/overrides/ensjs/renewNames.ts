import { encodeFunctionData, type Account, type Hex, type Transport } from 'viem'

import type { ChainWithEns, ClientWithAccount } from '@ensdomains/ensjs/contracts'
import { getChainContractAddress } from '@ensdomains/ensjs/contracts'
import { EMPTY_BYTES32 } from '@ensdomains/ensjs/utils'

/**
 * Override for ENS.js renewNames matching the Electroneum deployment:
 * - Single renewals go through ETHRegistrarController.renew(label, duration, referrer).
 * - Bulk renewals go through StaticBulkRenewal.renewAll(names, duration, referrer)
 *   (exposed as the `ensBulkRenewal` chain contract).
 *
 * There is intentionally no wrapped-name branch: the Electroneum NameWrapper has
 * no controller wired on-chain, so no contract can sync wrapper expiry on renewal.
 * Wrapping is disabled in the app until that exists; if it is added, route wrapped
 * renewals through the wrapper-aware contract here (the `hasWrapped` parameter is
 * kept in the type for that purpose).
 */

// Deployed ETHRegistrarController and StaticBulkRenewal both take a referrer
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
  /** Whether the name(s) are wrapped — currently unused, see file header */
  hasWrapped?: boolean
  /** Contract address for wrapped name renewals (optional override) */
  wrappedRenewalContract?: `0x${string}`
}

export type RenewNamesDataReturnType = {
  to: `0x${string}`
  data: Hex
  value: bigint
}

export const makeFunctionData = <TChain extends ChainWithEns, TAccount extends Account | undefined>(
  wallet: ClientWithAccount<Transport, TChain, TAccount>,
  { nameOrNames, duration, referrer = EMPTY_BYTES32, value }: RenewNamesDataParameters,
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

  return {
    to: getChainContractAddress({
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
