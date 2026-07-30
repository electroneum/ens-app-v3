import { render, screen } from '@app/test-utils'
import { describe, expect, it } from 'vitest'

import { CurrencyText } from './CurrencyText'

describe('CurrencyText', () => {
  it('should render correctly', async () => {
    render(<CurrencyText eth={4000000000000000000n} />)
    expect(screen.getByText('4.0000 ETN')).toBeVisible()
  })

  it('should cut off at 4 decimals', async () => {
    render(<CurrencyText eth={4444444444444444444n} />)
    expect(screen.getByText('4.4444 ETN')).toBeVisible()
  })
})