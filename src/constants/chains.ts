import { match } from 'ts-pattern'
import { localhost } from 'viem/chains'
import type { Chain } from 'viem'

import type { Register } from '@app/local-contracts'
import { makeLocalhostChainWithEnsAndOverrides } from '@app/overrides/makeLocalhostChainWithEnsAndOverrides'
import { electroneumMainnet, electroneumTestnet } from '@app/utils/chains/electroneumChains'

export const deploymentAddresses = JSON.parse(
  process.env.NEXT_PUBLIC_DEPLOYMENT_ADDRESSES || '{}',
) as Register['deploymentAddresses']

const localhostChain = { ...localhost, formatters: undefined } satisfies Chain

export const localhostWithEns = makeLocalhostChainWithEnsAndOverrides<typeof localhostChain>(
  localhostChain,
  deploymentAddresses,
)

const isElectroneumMainnet = process.env.NEXT_PUBLIC_ETN_NETWORK === 'mainnet'

export const electroneumDeploymentAddresses = JSON.parse(
  (isElectroneumMainnet
    ? process.env.NEXT_PUBLIC_ETN_MAINNET_DEPLOYMENT_ADDRESSES
    : process.env.NEXT_PUBLIC_ETN_TESTNET_DEPLOYMENT_ADDRESSES) || '{}',
) as Register['deploymentAddresses']

const activeElectroneumChain = isElectroneumMainnet ? electroneumMainnet : electroneumTestnet

const activeSubgraphUrl = isElectroneumMainnet
  ? process.env.NEXT_PUBLIC_ETN_MAINNET_SUBGRAPH_URL
  : process.env.NEXT_PUBLIC_ETN_TESTNET_SUBGRAPH_URL

export const electroneumWithEns = makeLocalhostChainWithEnsAndOverrides<typeof activeElectroneumChain>(
  activeElectroneumChain,
  electroneumDeploymentAddresses,
  activeSubgraphUrl,
)

export const chainsWithEns = [localhostWithEns, electroneumWithEns]

export const getSupportedChainById = (chainId: number | undefined) =>
  chainId ? chainsWithEns.find((c) => c.id === chainId) : undefined

export type SupportedChain = typeof localhostWithEns | typeof electroneumWithEns

export const getNetworkFromUrl = ():
  | 'mainnet'
  | 'sepolia'
  | 'localhost'
  | 'electroneum'
  | undefined => {
  // Chain override — checked first since it doesn't depend on `window`,
  // so server and client agree even during SSR.
  const chain = process.env.NEXT_PUBLIC_CHAIN_NAME
  if (chain === 'sepolia') return 'sepolia' as const
  if (chain === 'mainnet') return 'mainnet' as const
  if (chain === 'electroneum') return 'electroneum' as const

  if (typeof window === 'undefined') return undefined

  const { hostname } = window.location
  const segments = hostname.split('.')

  // Previews
  if (segments.length === 4) {
    /* Used for testing preview on mainnet at: test.app.ens.domains. Update by configuring dns */
    if (segments[0] === 'test') {
      return 'mainnet' as const
    }
    if (segments.slice(1).join('.') === 'ens-app-v3.pages.dev') {
      return 'sepolia' as const
    }
  }

  // Dev environment
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (process.env.NEXT_PUBLIC_PROVIDER) return 'localhost' as const
    return 'sepolia' as const
  }

  return match(segments[0])
    .with('sepolia', () => 'sepolia' as const)
    .otherwise(() => 'mainnet' as const)
}

export const getChainsFromUrl = () => {
  const network = getNetworkFromUrl()
  return match(network)
    .with('localhost', () => [localhostWithEns])
    .with('electroneum', () => [electroneumWithEns])
    .otherwise(() => [electroneumWithEns])
}