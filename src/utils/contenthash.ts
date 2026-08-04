import { DecodedContentHash } from '@ensdomains/ensjs/utils'

export type ContentHashProtocol =
  | 'ipfs'
  | 'ipns'
  | 'bzz'
  | 'onion'
  | 'onion3'
  | 'sia'
  | 'arweave'
  | 'ar'
  | 'adnl'

export type ContentHashProvider = 'ipfs' | 'swarm' | 'onion' | 'skynet' | 'arweave'

type GetContentHashLinkParameters = {
  name: string
  chainId: number
  decodedContentHash: DecodedContentHash
}

// name/chainId kept in the signature for call-site compatibility — the
// eth.limo gateway branch that used them was Ethereum-mainnet-only
export const getContentHashLink = ({ decodedContentHash }: GetContentHashLinkParameters) => {
  const protocol = decodedContentHash.protocolType
  const hash = decodedContentHash.decoded

  if (protocol === 'ipfs') {
    // subdomain-style secured origin gateway (cf-ipfs.com was shut down in 2024)
    return `https://${hash}.ipfs.dweb.link`
  }
  if (protocol === 'ipns') {
    return `https://${hash}.ipns.dweb.link`
  }
  if (protocol === 'bzz') {
    return `https://gateway.ethswarm.org/bzz/${hash}`
  }
  if (protocol === 'onion' || protocol === 'onion3') {
    return `http://${hash}.onion`
  }
  if (protocol === 'ar') {
    return `https://arweave.net/${hash}`
  }
  // sia/skynet gateways are defunct; no usable public link
  return null
}

export const contentHashToString = (
  decodedContentHash: DecodedContentHash | string | null | undefined,
): string => {
  if (typeof decodedContentHash === 'string') return decodedContentHash
  if (
    decodedContentHash &&
    typeof decodedContentHash === 'object' &&
    decodedContentHash?.decoded &&
    decodedContentHash?.protocolType
  )
    return `${decodedContentHash.protocolType}://${decodedContentHash.decoded}`
  return ''
}

const contentHashProtocolToProviderMap: Partial<Record<ContentHashProtocol, ContentHashProvider>> =
  {
    ipfs: 'ipfs',
    ipns: 'ipfs',
    bzz: 'swarm',
    onion: 'onion',
    onion3: 'onion',
    sia: 'skynet',
    arweave: 'arweave',
    ar: 'arweave',
    // 'adnl' (TON) has no editable content hash provider
  }

export const getContentHashProvider = (
  protocol: ContentHashProtocol,
): ContentHashProvider | undefined => contentHashProtocolToProviderMap[protocol]
