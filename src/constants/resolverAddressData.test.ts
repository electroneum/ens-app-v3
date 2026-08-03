import { expect, it } from 'vitest'

;(process.env as any).NODE_ENV = 'development'

it('should have the most recent resolver as the first address', async () => {
  // dynamic import for NODE_ENV to be set
  const { KNOWN_RESOLVER_DATA } = await import('./resolverAddressData')

  expect(KNOWN_RESOLVER_DATA['1']![0].address).toBe('0xF29100983E058B709F3D539b0c765937B804AC15')

  expect(KNOWN_RESOLVER_DATA['11155111']![0].address).toBe(
    '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5',
  )
  // localhost is not included by default in the resolver data
  // expect(KNOWN_RESOLVER_DATA['1337']![0].address).toEqual(
  //   getChainContractAddress({ chain: localhostWithEns, contract: 'ensPublicResolver' }),
  // )
})
