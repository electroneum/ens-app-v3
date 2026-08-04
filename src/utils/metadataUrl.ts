/**
 * ENS Metadata URL utilities
 *
 * This module provides utilities for constructing metadata service URLs.
 * Extracted to break dependency cycle between useEnsAvatar and metadataCache.
 *
 * There is no default endpoint: the upstream ENS metadata service
 * (metadata.ens.domains) does not serve Electroneum. Until an
 * Electroneum-hosted metadata service is available, set
 * NEXT_PUBLIC_METADATA_ENDPOINT to enable avatar/header images; when unset,
 * createMetaDataUrl returns null and avatars fall back to the zorb gradient.
 */

export const META_DATA_BASE_URL = process.env.NEXT_PUBLIC_METADATA_ENDPOINT || ''

/**
 * Creates a metadata service URL for ENS names
 * @param name - ENS name (e.g., 'wallet.etn')
 * @param chainName - Chain name (e.g., 'electroneum')
 * @param mediaKey - Media type ('avatar' or 'header')
 * @returns Metadata service URL or null if invalid parameters or no endpoint configured
 */
export const createMetaDataUrl = ({
  name,
  chainName,
  mediaKey = 'avatar',
}: {
  name?: string
  chainName: string
  mediaKey?: 'avatar' | 'header'
}): string | null => {
  if (!META_DATA_BASE_URL || !name || !chainName || !mediaKey) return null
  return `${META_DATA_BASE_URL}/${chainName}/${mediaKey}/${name}`
}
