import { useTranslation } from 'react-i18next'

import { Button, Dialog } from '@ensdomains/thorin'

import { CenteredTypography } from '../components/CenteredTypography'

type Props = {
  onCancel?: () => void
}
export const MigrateRegistryView = ({ onCancel }: Props) => {
  const { t } = useTranslation('transactionFlow')
  return (
    <>
      <Dialog.Heading
        title={t('input.profileEditor.warningOverlay.migrateRegistry.title')}
        alert="error"
      />
      <Dialog.Content>
        <CenteredTypography>
          {t('input.profileEditor.warningOverlay.migrateRegistry.subtitle')}
        </CenteredTypography>
      </Dialog.Content>
      <Dialog.Footer
        leading={
          <Button
            colorStyle="accentSecondary"
            onClick={onCancel}
            data-testid="warning-overlay-back-button"
          >
            {t('action.cancel', { ns: 'common' })}
          </Button>
        }
        trailing={
          <Button
            as="a"
            href="https://support.electroneum.com"
            target="_blank"
            data-testid="warning-overlay-next-button"
          >
            {t('input.profileEditor.warningOverlay.migrateRegistry.action')}
          </Button>
        }
      />
    </>
  )
}
