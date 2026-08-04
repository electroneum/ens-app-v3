import { useReadContract } from 'wagmi'

import { useContractAddress } from '@app/hooks/chain/useContractAddress'

/**
 * Fallback used while the on-chain value is loading or unavailable.
 * Matches the ETHRegistrarController deployment default on mainnet.
 */
export const FALLBACK_MIN_COMMITMENT_AGE_SECONDS = 60

/**
 * ABI snippet for `ETHRegistrarController.minCommitmentAge() -> uint256`.
 *
 * `@ensdomains/ensjs/contracts` does not export a snippet for this getter
 * (it only ships `commitments`/`commit` snippets), so we declare it inline -
 * same pattern as the `maxCommitmentAge` snippet in `useExistingCommitment`.
 */
const minCommitmentAgeSnippet = [
  {
    inputs: [],
    name: 'minCommitmentAge',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * Reads `minCommitmentAge` from the ETHRegistrarController.
 *
 * This is the number of seconds that must elapse between the commit and
 * register transactions. Registering earlier reverts with `CommitmentTooNew`,
 * so the registration countdown must be driven by this value rather than a
 * hardcoded 60 seconds (deployments may configure a different age).
 *
 * The value is set once in the controller's constructor and is immutable for
 * a given deployment, hence `staleTime: Infinity`.
 */
export const useMinCommitmentAge = () => {
  const ethRegistrarControllerAddress = useContractAddress({
    contract: 'ensEthRegistrarController',
  })

  return useReadContract({
    abi: minCommitmentAgeSnippet,
    address: ethRegistrarControllerAddress,
    functionName: 'minCommitmentAge',
    query: {
      enabled: !!ethRegistrarControllerAddress,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  })
}
