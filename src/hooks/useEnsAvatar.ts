import { QueryFunctionContext, useQuery, UseQueryOptions } from '@tanstack/react-query'

import { getCacheBustExpiry, TTL_MS } from '@app/utils/metadataCache'
import { createMetaDataUrl, META_DATA_BASE_URL } from '@app/utils/metadataUrl'

import { useChainName } from './chain/useChainName'
import { useRecords } from './ensjs/public/useRecords'
import { getAvatarSrc } from './useAvatarFromRecord'

export const META_DATA_QUERY_KEY = 'ensMetaData'

const STALE_TIME = TTL_MS + 10 * 60 * 1000 // Metadata cache expirty time plus 10 minutes for transaction time

const checkImageExists = async (
  context: QueryFunctionContext<[string, string | null]>,
): Promise<null | string> => {
  const [, imageUrl] = context.queryKey
  if (!imageUrl) return null

  // Append expiry if present for cache-busting
  const cacheBustExpiry = getCacheBustExpiry(imageUrl)
  const imageUrlWithExpiry = cacheBustExpiry ? `${imageUrl}?expiry=${cacheBustExpiry}` : imageUrl

  try {
    const response = await fetch(imageUrlWithExpiry, { method: 'GET' })
    return response.ok ? imageUrlWithExpiry : null
  } catch (error) {
    return null
  }
}

type UseEnsAvatarParameters = Omit<UseQueryOptions, 'queryFn' | 'queryKey'> & {
  name?: string
  key?: 'avatar' | 'header'
}

/**
 * Resolves the avatar/header image URL for a name.
 *
 * When NEXT_PUBLIC_METADATA_ENDPOINT is configured, images are served by the
 * ENS-metadata-service-compatible endpoint (cached/normalized server-side).
 * Otherwise the avatar/header text record is read directly from the chain and
 * its URL is derived client-side (http/ipfs/ar schemes) — no validation fetch
 * is made in that mode, since hotlinked hosts rarely send CORS headers and a
 * failed preflight would wrongly discard a renderable image.
 */
export const useEnsAvatar = ({
  name,
  key = 'avatar',
  staleTime,
  enabled = true,
}: UseEnsAvatarParameters) => {
  const chainName = useChainName()
  const useMetadataService = !!META_DATA_BASE_URL
  const url = createMetaDataUrl({ name, chainName, mediaKey: key })

  const metadataQuery = useQuery({
    queryKey: [META_DATA_QUERY_KEY, url],
    queryFn: checkImageExists,
    staleTime: staleTime ?? STALE_TIME,
    enabled: enabled && useMetadataService && !!url,
  })

  // Client-side path: read the text record from chain. The 'standard' query
  // key means it invalidates with the other chain queries after transactions.
  const records = useRecords({
    name,
    texts: [key] as const,
    enabled: enabled && !useMetadataService && !!name,
  })
  const recordValue = records.data?.texts?.find((text) => text.key === key)?.value

  const recordQuery = useQuery({
    queryKey: [META_DATA_QUERY_KEY, 'record', recordValue ?? null],
    queryFn: async () => {
      if (!recordValue) return null
      return (await getAvatarSrc(recordValue)) ?? null
    },
    staleTime: staleTime ?? STALE_TIME,
    enabled: enabled && !useMetadataService && !!recordValue,
  })

  if (useMetadataService) return metadataQuery

  return {
    ...recordQuery,
    isLoading: records.isLoading || recordQuery.isLoading,
  }
}
