import { match } from 'ts-pattern'
import type { Chain } from 'viem'
import { localhost } from 'viem/chains'

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

export const electroneumWithEns = makeLocalhostChainWithEnsAndOverrides<
  typeof activeElectroneumChain
>(activeElectroneumChain, electroneumDeploymentAddresses, activeSubgraphUrl)

export const chainsWithEns = [localhostWithEns, electroneumWithEns]

export const getSupportedChainById = (chainId: number | undefined) =>
  chainId ? chainsWithEns.find((c) => c.id === chainId) : undefined

// DNS import requires the DNSSEC contracts (DNSRegistrar et al) to be deployed
// on the active chain. Their entries are omitted from the chain config when the
// deployment addresses are absent (see makeLocalhostChainWithEns).
export const getChainSupportsDnsImport = (chainId: number | undefined) => {
  const chain = getSupportedChainById(chainId)
  return !!chain && 'ensDnsRegistrar' in chain.contracts
}

// Wrapping is only safe when the chain has a wrapper-aware renewal contract;
// without one, renewing a wrapped name desyncs the wrapper expiry with no
// on-chain repair path. On Electroneum no NameWrapper controller is wired yet.
export const getChainSupportsNameWrapping = (chainId: number | undefined) => {
  const chain = getSupportedChainById(chainId)
  return !!chain && 'wrappedRenewalWithReferrer' in chain.contracts
}

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

  // Dev environment
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (process.env.NEXT_PUBLIC_PROVIDER) return 'localhost' as const
    return 'electroneum' as const
  }

  // This fork only ever serves Electroneum — never fall back to an Ethereum
  // network string (consumers key display logic off this value).
  return 'electroneum' as const
}

export const getChainsFromUrl = () => {
  const network = getNetworkFromUrl()
  return match(network)
    .with('localhost', () => [localhostWithEns])
    .with('electroneum', () => [electroneumWithEns])
    .otherwise(() => [electroneumWithEns])
}
