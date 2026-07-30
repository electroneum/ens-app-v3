/* eslint-disable import/no-extraneous-dependencies */
import { Accounts } from '../accounts.js'
import { testClient, waitForTransaction } from '../contracts/utils/addTestContracts'
import { Subgraph } from '../subgraph.js'
import { Time } from '../time.js'
import { makeWrappedNameGenerator, WrappedName } from './generators/wrappedNameGenerator.js'
import { adjustName } from './utils/adjustName.js'
import { getTimeOffset } from './utils/getTimeOffset.js'

type Dependencies = {
  accounts: Accounts
  time: Time
  subgraph: Subgraph
}

export type Name = WrappedName

type Options = {
  timeOffset?: number
  syncSubgraph?: boolean
}

export function createMakeNames({ accounts, time, subgraph }: Dependencies) {
  async function makeNames(name: Name, options?: Options): Promise<string>
  async function makeNames(names: Name[], options?: Options): Promise<string[]>
  async function makeNames(
    nameOrNames: Name | Name[],
    { timeOffset, syncSubgraph }: Options = {},
  ): Promise<string | string[]> {
    const names: Name[] = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames]
    const offset = await getTimeOffset({ names })
    const adjustedNames = adjustName(names, offset)

    const _timeOffset = timeOffset ?? 0
    const _syncSubgraph = syncSubgraph ?? true

    // Create generators
    const wrappedNameGenerator = makeWrappedNameGenerator({ accounts })

    // Set automine to false put all transactions on the same block
    await testClient.setAutomine(false)

    // Clear out any pending transactions
    await testClient.mine({ blocks: 1 })

    const commitTxs = await Promise.all(
      adjustedNames.map((name) => wrappedNameGenerator.commit(name)),
    )
    await testClient.mine({ blocks: 1 })
    await Promise.all(commitTxs.map((tx) => waitForTransaction(tx)))

    await testClient.increaseTime({ seconds: 120 }) // I use 120 because sometimes with anvil you need to wait a bit longer when registering multiple names at once
    await testClient.mine({ blocks: 1 })

    const registerTxs = await Promise.all(
      adjustedNames.map((name) => wrappedNameGenerator.register(name)),
    )
    await testClient.mine({ blocks: 1 })
    await Promise.all(registerTxs.map((tx) => waitForTransaction(tx)))

    await testClient.setAutomine(true)

    // Make sure that registration and subnames are on different block or it might cause the subgraph to crash due to
    // RegisterName and TransferName event having the same event ids.
    await testClient.mine({ blocks: 1 })

    // Finish setting up names
    for (const name of adjustedNames) {
      await wrappedNameGenerator.configure(name)
    }

    if (offset > 0) {
      console.warn('You are increasing the block timestamp. Do not run this test in parallel mode.')
      await testClient.increaseTime({ seconds: offset })
      await testClient.mine({ blocks: 1 })
    }

    if (_syncSubgraph) await subgraph.sync()

    await time.sync(_timeOffset)

    const ethNames = adjustedNames.map((name) => `${name.label}.eth`)
    if (ethNames.length === 1) return ethNames[0] as string
    return ethNames
  }
  return makeNames
}
