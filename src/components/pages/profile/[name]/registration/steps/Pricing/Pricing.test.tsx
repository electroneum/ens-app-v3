import { render, screen } from '@app/test-utils'
import { describe, expect, it } from 'vitest'

import { yearsToSeconds } from '@app/utils/utils'

import { ActionButton, ActionButtonProps } from './Pricing'

import { BreakpointProvider } from '@app/utils/BreakpointProvider'

describe('ActionButton', () => {
  const baseMockData: ActionButtonProps = {
    address: '0x123',
    reverseRecord: false,
    callback: () => null,
    seconds: yearsToSeconds(1),
    balance: { value: 100n } as any,
    totalRequiredBalance: 1n,
    estimatedTotal: 1n,
    ethPrice: 1n,
    durationType: 'years',
  }

  it('should show "Next" if balance is sufficient', () => {
    render(<ActionButton {...baseMockData} />)
    expect(screen.getByText('action.next')).toBeInTheDocument()
  })

  it('should show "Insufficient balance" if balance is too low', () => {
    render(
      <ActionButton
        {...{
          ...baseMockData,
          balance: { value: 0n } as any,
        }}
      />,
    )
    expect(screen.getByText('steps.pricing.insufficientBalance')).toBeInTheDocument()
  })

  it('should show loading state if balance data is not yet available', () => {
    render(
      <ActionButton
        {...{
          ...baseMockData,
          balance: undefined,
        }}
      />,
    )
    expect(screen.getByText('steps.info.processing')).toBeInTheDocument()
  })

it('should not show "Next" if address is not connected', () => {
    const breakpoints = {
      xs: '(min-width: 360px)',
      sm: '(min-width: 640px)',
      md: '(min-width: 768px)',
      lg: '(min-width: 1024px)',
      xl: '(min-width: 1280px)',
    }
    render(
      <BreakpointProvider queries={breakpoints}>
        <ActionButton
          {...{
            ...baseMockData,
            address: undefined,
          }}
        />
      </BreakpointProvider>,
    )
    expect(screen.queryByText('action.next')).not.toBeInTheDocument()
  })
})