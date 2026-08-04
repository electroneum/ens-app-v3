import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, useChainId } from 'wagmi'

import { Button, Toast } from '@ensdomains/thorin'

import { getSupportedChainById } from '@app/constants/chains'
import { electroneumMainnet, electroneumTestnet } from '@app/utils/chains/electroneumChains'

import { shouldOpenModal } from './utils'

const appLinks: Record<number, string> = {
  [electroneumMainnet.id]: 'ens.electroneum.com',
  [electroneumTestnet.id]: 'ens.electroneum.com',
}

export const NetworkNotifications = () => {
  const { t } = useTranslation()
  const account = useAccount()
  const connectedChainId = useChainId()
  const [open, setOpen] = useState<boolean>(false)

  const accountChainId = account?.chainId

  useEffect(() => {
    setOpen(shouldOpenModal(connectedChainId, accountChainId))
  }, [connectedChainId, accountChainId])

  const accountChain = getSupportedChainById(accountChainId)
  if (!accountChain) return null
  const accountChainName = accountChain.name

  return (
    <Toast
      description={t(`networkNotifications.${accountChainName}.description`)}
      open={open}
      title={t(`networkNotifications.${accountChainName}.title`)}
      variant="desktop"
      onClose={() => setOpen(false)}
    >
      <Button size="small" as="a" href={`https://${appLinks[accountChain.id] ?? ''}`}>
        {t(`networkNotifications.${accountChainName}.action`)}
      </Button>
    </Toast>
  )
}
