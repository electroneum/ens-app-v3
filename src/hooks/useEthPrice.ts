import { Address } from 'viem'
import { useReadContract } from 'wagmi'

import { useAddressRecord } from './ensjs/public/useAddressRecord'

const ORACLE_ENS = 'etn-usd.resolver.etn'

/**
 * ETN/USD price from the OwnedUsdOracle, resolved via the etn-usd.resolver.etn
 * address record. The raw int256 uses the Chainlink 8-decimal convention
 * (e.g. 86000 = $0.00086/ETN) — scale by 1e8 before displaying. Currently only
 * consumed as an opaque analytics field.
 */
export const useEthPrice = () => {
  const { data: address_ } = useAddressRecord({
    name: ORACLE_ENS,
  })

  const address = (address_?.value as Address) || undefined

  return useReadContract({
    abi: [
      {
        inputs: [],
        name: 'latestAnswer',
        outputs: [{ name: '', type: 'int256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    address,
    functionName: 'latestAnswer',
  })
}
