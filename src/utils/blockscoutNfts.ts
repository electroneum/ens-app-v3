/* eslint-disable @typescript-eslint/naming-convention -- snake_case fields mirror Blockscout's and the avatar record's wire formats */
/**
 * NFT inventory via Blockscout's REST v2 API.
 *
 * Upstream sources the avatar NFT picker from an Alchemy-style worker
 * (NEXT_PUBLIC_NFT_WORKER_URL), which doesn't index Electroneum. Blockscout
 * indexes ERC-721/1155 ownership and serves it with open CORS, so the picker
 * reads it directly from the browser — no intermediary service.
 *
 * The Alchemy response shape (OwnedNFT) is kept as the internal interface so
 * the picker component stays close to upstream; only this module knows about
 * Blockscout's wire format.
 */

export type OwnedNFT = {
  contract: {
    address: string
  }
  id: {
    tokenId: string
    tokenMetadata: {
      tokenType: 'ERC721' | 'ERC1155'
    }
  }
  balance: string
  title: string
  description: string
  tokenUri: {
    raw: string
    gateway: string
  }
  media: {
    raw: string
    gateway: string
    thumbnail?: string
    format?: string
  }[]
  metadata: {
    image: string
    external_url: string
    background_color: string
    name: string
    description: string
    attributes: string
  }
}

export type NFTResponse = {
  ownedNfts: OwnedNFT[]
  pageKey: string
  totalCount: number
}

type BlockscoutNftItem = {
  id: string
  token_type: string
  value: string | null
  image_url: string | null
  media_url: string | null
  external_app_url: string | null
  metadata: {
    name?: unknown
    description?: unknown
    image?: unknown
    attributes?: unknown
  } | null
  thumbnails: Record<string, string> | null
  token: {
    address: string
    name: string | null
    symbol: string | null
    type: string
  }
}

type BlockscoutNftResponse = {
  items?: BlockscoutNftItem[]
  next_page_params?: Record<string, string | number | boolean | null> | null
}

export const getBlockscoutNftApiBase = (chainId: number | undefined): string | null => {
  switch (chainId) {
    case 52014:
      return 'https://blockexplorer.electroneum.com/api/v2'
    case 5201420:
      return 'https://testnet-blockexplorer.electroneum.com/api/v2'
    default:
      return null
  }
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

const mapBlockscoutNft = (item: BlockscoutNftItem): OwnedNFT | null => {
  const tokenType =
    // eslint-disable-next-line no-nested-ternary
    item.token_type === 'ERC-721'
      ? ('ERC721' as const)
      : item.token_type === 'ERC-1155'
      ? ('ERC1155' as const)
      : null
  if (!tokenType) return null

  // image_url is Blockscout's gateway-resolved URL (ipfs:// already mapped);
  // media_url may still be a raw ipfs:// URI
  const gateway = item.image_url ?? ''
  const thumbnail = item.thumbnails?.['250x250'] ?? item.thumbnails?.['500x500'] ?? undefined
  const name = asString(item.metadata?.name)
  const title = name || (item.token.name ? `${item.token.name} #${item.id}` : '')
  const description = asString(item.metadata?.description)

  return {
    contract: { address: item.token.address },
    id: {
      tokenId: item.id,
      tokenMetadata: { tokenType },
    },
    balance: item.value ?? '1',
    title,
    description,
    tokenUri: { raw: '', gateway: '' },
    media: [{ raw: item.media_url ?? gateway, gateway, thumbnail }],
    metadata: {
      image: gateway,
      external_url: item.external_app_url ?? '',
      background_color: '',
      name: title,
      description,
      attributes: item.metadata?.attributes ? JSON.stringify(item.metadata.attributes) : '',
    },
  }
}

// pageKey carries Blockscout's next_page_params through the picker's opaque
// Alchemy-style cursor: JSON-encoded on the way out, decoded into query
// params on the next request.
export async function getNftsFromBlockscout({
  chainId,
  owner,
  pageKey,
}: {
  chainId: number | undefined
  owner: string
  pageKey: string
}): Promise<NFTResponse> {
  const base = getBlockscoutNftApiBase(chainId)
  if (!base) return { ownedNfts: [], pageKey: '', totalCount: 0 }

  const urlParams = new URLSearchParams()
  urlParams.append('type', 'ERC-721,ERC-1155')
  if (pageKey) {
    try {
      const parsed = JSON.parse(pageKey) as Record<string, unknown>
      for (const [key, value] of Object.entries(parsed)) {
        if (value !== null && value !== undefined) urlParams.append(key, String(value))
      }
    } catch {
      // unrecognised cursor — fall through to the first page
    }
  }

  const res = await fetch(`${base}/addresses/${owner}/nft?${urlParams.toString()}`, {
    method: 'GET',
    redirect: 'follow',
  })
  const data = (await res.json()) as BlockscoutNftResponse

  const ownedNfts = (data.items ?? [])
    .map(mapBlockscoutNft)
    .filter((nft): nft is OwnedNFT => nft !== null)

  return {
    ownedNfts,
    pageKey: data.next_page_params ? JSON.stringify(data.next_page_params) : '',
    totalCount: ownedNfts.length,
  }
}
