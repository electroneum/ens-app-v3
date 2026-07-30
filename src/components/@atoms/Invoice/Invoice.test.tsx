import { render, screen } from '@app/test-utils'
import { describe, expect, it } from 'vitest'

import { Invoice } from './Invoice'

const items = [
  {
    label: 'line 1',
    value: 1000000000000000000n,
  },
  {
    label: 'line 2',
    value: 2000000000000000000n,
  },
]

describe('Invoice', () => {
  it('should render correctly', async () => {
    render(<Invoice items={items} totalLabel="total" />)
    expect(screen.getByText('line 1')).toBeVisible()
    expect(screen.getByText('1.0000 ETN')).toBeVisible()
    expect(screen.getByText('line 2')).toBeVisible()
    expect(screen.getByText('2.0000 ETN')).toBeVisible()
    expect(screen.getByText('total')).toBeVisible()
    expect(screen.getByText('3.0000 ETN')).toBeVisible()
  })
})