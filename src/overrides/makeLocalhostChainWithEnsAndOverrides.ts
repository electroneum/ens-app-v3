import type { Address, Chain } from 'viem'

import type { Register } from '@app/local-contracts'
import {
  AdditionalContracts,
  LocalhostChainWithEnsAndContracts,
} from '@app/overrides/addEnsContractsWithSubgraphAndOverrides'
import { makeLocalhostChainWithEns } from '@app/utils/chains/makeLocalhostChainWithEns'

export const makeLocalhostChainWithEnsAndOverrides = <const T extends Chain>(
  localhost: T,
  deploymentAddresses: Register['deploymentAddresses'],
  subgraphUrl?: string,
): LocalhostChainWithEnsAndContracts<T, AdditionalContracts> => {
  const chainWithEns = makeLocalhostChainWithEns(localhost, deploymentAddresses, subgraphUrl)

  return {
    ...chainWithEns,
    contracts: {
      ...chainWithEns.contracts,
      // Only define contracts whose addresses are actually deployed, so that
      // getChainContractAddress throws instead of returning undefined (which
      // would otherwise end up as a `to: undefined` contract-creation tx).
      ...(deploymentAddresses.WrappedStaticBulkRenewal && {
        ensBulkRenewal: {
          address: deploymentAddresses.WrappedStaticBulkRenewal as Address,
        },
      }),
      ...(deploymentAddresses.UniversalRegistrarRenewalWithReferrer && {
        wrappedRenewalWithReferrer: {
          address: deploymentAddresses.UniversalRegistrarRenewalWithReferrer as Address,
        },
      }),
    },
  } as LocalhostChainWithEnsAndContracts<T, AdditionalContracts>
}
