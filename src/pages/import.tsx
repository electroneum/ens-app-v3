import { useRouter } from 'next/router'
import { ReactElement, useEffect } from 'react'
import { useChainId } from 'wagmi'

import { DnsClaim } from '@app/components/pages/import/[name]/DnsClaim'
import { getChainSupportsDnsImport } from '@app/constants/chains'
import { ContentGrid } from '@app/layouts/ContentGrid'

export default function Page() {
  const router = useRouter()
  const chainId = useChainId()
  const dnsImportSupported = getChainSupportsDnsImport(chainId)

  // DNS import needs the DNSSEC contracts, which are not wired on this chain
  useEffect(() => {
    if (!dnsImportSupported) {
      router.replace('/')
    }
  }, [dnsImportSupported, router])

  if (!dnsImportSupported) return null

  return <DnsClaim />
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <ContentGrid>{page}</ContentGrid>
}
