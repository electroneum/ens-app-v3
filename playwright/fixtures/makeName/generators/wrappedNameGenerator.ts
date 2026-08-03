/* eslint-disable import/no-extraneous-dependencies */

/* eslint-disable no-await-in-loop */
import { Hash } from 'viem'

import { getPrice } from '@ensdomains/ensjs/public'
import {
  EncodeChildFusesInputObject,
  RecordOptions,
} from '@ensdomains/ensjs/utils'
import { setFuses, setResolver, transferName, unwrapName } from '@ensdomains/ensjs/wallet'
import { commitName, registerName, RegistrationParameters } from './utils/registerWrappeName'

import { Accounts, User } from '../../accounts'
import {
  testClient,
  waitForTransaction,
  walletClient,
} from '../../contracts/utils/addTestContracts'
import { Name } from '../index'
import { generateRecords } from './generateRecords'
import { generateWrappedSubname, WrappedSubname } from './generateWrappedSubname'

const DEFAULT_RESOLVER = testClient.chain.contracts.ensPublicResolver.address

export type WrappedName = {
  // 'legacy' registers the name through the wrapper like 'wrapped', then
  // unwraps it immediately afterwards - reproducing the "unwrapped name"
  // state without depending on the pre-wrapper legacy contracts, which
  // don't exist on this deployment.
  type: 'wrapped' | 'legacy'
  label: string
  owner?: User
  manager?: User
  duration?: number
  secret?: Hash
  resolver?: Hash
  reverseRecord?: boolean
  fuses?: EncodeChildFusesInputObject
  addr?: User
  records?: RecordOptions
  subnames?: Omit<WrappedSubname, 'name' | 'nameOwner'>[]
  offset?: number
}

type Dependencies = {
  accounts: Accounts
}

export const isWrappendName = (name: Name): name is WrappedName =>
  name.type === 'wrapped' || name.type === 'legacy'

const nameWithDefaults = (name: WrappedName) => ({
  ...name,
  duration: name.duration ?? 31536000,
  secret: name.secret ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
  resolver: name.resolver ?? DEFAULT_RESOLVER,
  owner: name.owner ?? 'user',
  manager: name.manager ?? name.owner ?? 'user',
})

const getParentFuses = (
  fuses?: EncodeChildFusesInputObject,
): EncodeChildFusesInputObject | undefined => {
  if (!fuses) return undefined
  return {
    named: fuses.named?.filter((fuse) => ['CANNOT_UNWRAP'].includes(fuse)) ?? [],
  }
}

const getChildFuses = (
  fuses?: EncodeChildFusesInputObject,
): EncodeChildFusesInputObject | undefined => {
  if (!fuses) return undefined
  return {
    named: fuses.named?.filter((fuse) => !['CANNOT_UNWRAP'].includes(fuse)) ?? [],
  }
}

export const makeWrappedNameGenerator = ({ accounts }: Dependencies) => ({
  commit: async (nameConfig: WrappedName) => {
    const { label, owner, resolver, duration, secret, fuses } = nameWithDefaults(nameConfig)
    const name = `${label}.eth`
    const parentFuses = getParentFuses(fuses)

    const ownerAddress = accounts.getAddress(owner) as `0x${string}`
    console.log('generating wrapped name:', name, 'with owner:', ownerAddress)

    const hasValidResolver =
      resolver.toLocaleLowerCase() ===
      testClient.chain.contracts.ensPublicResolver.address.toLowerCase()
    const _resolver = hasValidResolver ? resolver : DEFAULT_RESOLVER

    const params: RegistrationParameters = {
      name,
      duration,
      owner: ownerAddress as `0x${string}`,
      secret: secret as `0x${string}`,
      resolverAddress: _resolver as `0x${string}`,
      fuses: parentFuses,
    }

    const data = commitName.makeFunctionData(walletClient, params)

    const prepared = await walletClient.prepareTransactionRequest({
      ...data,
      account: accounts.getAccountForUser(owner),
      gas: 1000000n, // This is necessary to bypass the gas estimation which will throw an error at times because the nonce is off
    })

    return walletClient.sendTransaction(prepared)
  },
  register: async (nameConfig: WrappedName) => {
    const { label, duration, owner, resolver, fuses, secret } = nameWithDefaults(nameConfig)
    const name = `${label}.eth`
    const parentFuses = getParentFuses(fuses)

    const ownerAddress = accounts.getAddress(owner) as `0x${string}`
    const hasValidResolver =
      resolver.toLocaleLowerCase() ===
      testClient.chain.contracts.ensPublicResolver.address.toLowerCase()
    const _resolver = hasValidResolver ? resolver : DEFAULT_RESOLVER

    const price = await getPrice(walletClient, {
      nameOrNames: name,
      duration: duration,
    })
    const total = price!.base + price!.premium

    console.log('registering name:', name)

    const data = registerName.makeFunctionData(walletClient, {
      name,
      duration,
      owner: ownerAddress,
      secret,
      resolverAddress: _resolver,
      fuses: parentFuses,
      value: total,
    })

    const prepared = await walletClient.prepareTransactionRequest({
      ...data,
      account: accounts.getAccountForUser(owner),
      gas: 1000000n, // This is necessary to bypass the gas estimation which will throw an error at times because of the pending
    })

    return walletClient.sendTransaction(prepared)
  },
  configure: async (nameConfig: WrappedName) => {
    const { label, owner, manager, addr, resolver, records, subnames = [], fuses, type } =
      nameWithDefaults(nameConfig)
    const name = `${label}.eth`
    const childFuses = getChildFuses(fuses)
    const ownerAddress = accounts.getAddress(owner) as `0x${string}`
    const hasValidResolver =
      resolver.toLocaleLowerCase() ===
      testClient.chain.contracts.ensPublicResolver.address.toLowerCase()
    const _resolver = hasValidResolver ? resolver : DEFAULT_RESOLVER

    const recordsWithAddr = addr
      ? {
          ...records,
          coins: [
            ...(records?.coins ?? []),
            { coin: 60, value: accounts.getAddress(addr) },
          ],
        }
      : records

    if (recordsWithAddr) {
      await generateRecords({ accounts })({
        name,
        owner,
        resolver: _resolver as `0x${string}`,
        records: recordsWithAddr,
      })
    }

    for (const subname of subnames)  {
        await generateWrappedSubname({ accounts })({
          ...subname,
          name: `${label}.eth`,
          nameOwner: owner,
          resolver: subname.resolver ?? _resolver,
        })
      }

    if (!hasValidResolver && resolver) {
      console.log('setting resolver: ', name, resolver)
      const resolverTx = await setResolver(walletClient, {
        name,
        contract: 'nameWrapper',
        resolverAddress: resolver,
        account: ownerAddress as `0x${string}`,
      })
      await waitForTransaction(resolverTx)

      if (recordsWithAddr) await generateRecords({ accounts })({
        name,
        owner,
        resolver: resolver as `0x${string}`,
        records: recordsWithAddr,
      })
    }

    if (childFuses) {
      console.log('setting fuses:', name, fuses)
      const fusesTx = await setFuses(walletClient, {
        name,
        fuses: childFuses,
        account: accounts.getAccountForUser(owner),
      })
      await waitForTransaction(fusesTx)
    }

    if (manager !== owner) {
      console.log('setting manager:', name, manager)
      const managerTx = await transferName(walletClient, {
        name,
        newOwnerAddress: accounts.getAddress(manager) as `0x${string}`,
        contract: 'nameWrapper',
        account: ownerAddress,
      })
      await waitForTransaction(managerTx)
    }

    // 'legacy' reproduces the "unwrapped name" state (achievable today via
    // the wrapper's own unwrap function) without the pre-wrapper legacy
    // contracts this deployment never had.
    if (type === 'legacy') {
      console.log('unwrapping name:', name)
      // `name` is a runtime-built eth-2ld string; TS can't narrow a generic
      // template literal to the Eth2ldName type GetNameType relies on to
      // allow `newRegistrantAddress`, so the params are asserted here.
      const unwrapTx = await unwrapName(walletClient, {
        name,
        newOwnerAddress: accounts.getAddress(manager) as `0x${string}`,
        newRegistrantAddress: accounts.getAddress(owner) as `0x${string}`,
        account: accounts.getAccountForUser(owner),
      } as unknown as Parameters<typeof unwrapName>[1])
      await waitForTransaction(unwrapTx)
    }
  },
})
