import type { Address, Chain } from 'viem'

import { ChainWithEns } from '@ensdomains/ensjs/contracts'

import type { Register } from '@app/local-contracts'

// Build a contract entry only when the deployment address exists. Omitting the
// key entirely makes viem's getChainContractAddress throw a visible
// ChainDoesNotSupportContract error instead of silently returning undefined,
// which would otherwise surface as a `to: undefined` contract-creation tx.
const contractEntry = <TKey extends string>(key: TKey, address: string | undefined) =>
  (address ? { [key]: { address: address as Address } } : {}) as {
    [K in TKey]: { address: Address }
  }

export const makeLocalhostChainWithEns = <T extends Chain>(
  localhost: T,
  deploymentAddresses_: Register['deploymentAddresses'],
  subgraphUrl?: string,
): ChainWithEns<T> => {
  return {
    ...localhost,
    blockExplorers: localhost.blockExplorers ?? {
      default: {
        name: 'Etherscan',
        url: 'https://localhost.etherscan.io',
      },
    },
    contracts: {
      ...localhost.contracts,
      ...contractEntry('ensRegistry', deploymentAddresses_.ENSRegistry),
      ...contractEntry('ensUniversalResolver', deploymentAddresses_.UniversalResolver),
      ...contractEntry('multicall3', deploymentAddresses_.Multicall),
      ...contractEntry(
        'ensBaseRegistrarImplementation',
        deploymentAddresses_.BaseRegistrarImplementation,
      ),
      ...contractEntry('ensDnsRegistrar', deploymentAddresses_.DNSRegistrar),
      ...contractEntry('ensEthRegistrarController', deploymentAddresses_.ETHRegistrarController),
      ...contractEntry('ensNameWrapper', deploymentAddresses_.NameWrapper),
      ...contractEntry('ensPublicResolver', deploymentAddresses_.PublicResolver),
      ...contractEntry('ensReverseRegistrar', deploymentAddresses_.ReverseRegistrar),
      ...contractEntry('ensBulkRenewal', deploymentAddresses_.WrappedStaticBulkRenewal),
      ...contractEntry('ensDnssecImpl', deploymentAddresses_.DNSSECImpl),
      ...contractEntry(
        'legacyEthRegistrarController',
        deploymentAddresses_.LegacyETHRegistrarController,
      ),
      ...contractEntry('legacyPublicResolver', deploymentAddresses_.LegacyPublicResolver),
      ...contractEntry(
        'wrappedEthRegistrarController',
        deploymentAddresses_.WrappedEthRegistrarController,
      ),
      ...contractEntry('wrappedPublicResolver', deploymentAddresses_.NameWrapperPublicResolver),
      ...contractEntry('ensDefaultReverseRegistrar', deploymentAddresses_.DefaultReverseRegistrar),
      ...contractEntry('wrappedBulkRenewal', deploymentAddresses_.WrappedStaticBulkRenewal),
    },
    subgraphs: {
      ens: {
        url: subgraphUrl ?? 'http://localhost:42069/subgraph',
      },
    },
  } as ChainWithEns<T>
}
