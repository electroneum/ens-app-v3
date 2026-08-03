import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'

import { Banner } from '@ensdomains/thorin'

const Container = styled.div(
  ({ theme }) => css`
    display: flex;
    justify-content: center;
    padding: ${theme.space['4']} 0;
  `,
)

const RegistrationDisabledBanner = () => {
  const { t } = useTranslation('register')
  return (
    <Container>
      <Banner alert="warning" title={t('disabled.title')}>
        {t('disabled.banner')}
      </Banner>
    </Container>
  )
}

export default RegistrationDisabledBanner
