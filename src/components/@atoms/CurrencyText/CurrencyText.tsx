import { Skeleton } from '@ensdomains/thorin'

import { makeDisplay } from '@app/utils/currency'

type Props = {
  eth?: bigint
  /* Percentage buffer to multiply value by when displaying, defaults to 100 */
  bufferPercentage?: bigint
}

export const makeCurrencyDisplay = ({ eth, bufferPercentage = 100n }: Props) => {
  if (!eth) return '0.0000 ETN'
  return makeDisplay({ value: (eth * bufferPercentage) / 100n, symbol: 'etn' })
}

export const CurrencyText = ({ eth, bufferPercentage = 100n }: Props) => {
  const isLoading = !eth
  return (
    <Skeleton loading={isLoading}>
      {(() => {
        if (isLoading) return '0.0000 ETN'
        return makeCurrencyDisplay({ eth, bufferPercentage })
      })()}
    </Skeleton>
  )
}