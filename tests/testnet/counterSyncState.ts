import { Counter } from '../../src/contracts/counter'
import { getDefaultSigner } from './util/txHelper'
import { bsv, MethodCallOptions } from 'scrypt-ts'

async function compileContract() {
    await Counter.compile()
}

async function createInitialInstance(initialCount = 100n): Promise<Counter> {
    const counter = new Counter(initialCount)
    await counter.connect(getDefaultSigner())
    return counter
}

async function recoverInstance(
    tx: bsv.Transaction,
    atOutputIndex = 0
): Promise<Counter> {
    // always create an instance with the same constructor arguments as when deploying the contract
    const instance = await createInitialInstance()
    // sync state from tx
    instance.syncState(tx, atOutputIndex)
    console.log('Counter instance recovered')
    return instance
}

async function deploy(instance: Counter): Promise<bsv.Transaction> {
    const tx = await instance.deploy(1)
    console.log(`Counter deployed: ${tx.id}, the count is: ${instance.count}`)
    return tx
}

async function callIncrementOnChain(
    instance: Counter
): Promise<bsv.Transaction> {
    const nextInstance = instance.next()
    nextInstance.increment()
    const { tx } = await instance.methods.incrementOnChain({
        next: {
            instance: nextInstance,
            balance:
                instance.from.tx.outputs[instance.from.outputIndex].satoshis,
        },
    } as MethodCallOptions<Counter>)
    console.log(
        `Counter incrementOnChain called: ${tx.id}, the count now is: ${nextInstance.count}`
    )
    return tx
}

async function main() {
    await compileContract()
    let lastTx = await deploy(await createInitialInstance())
    for (let i = 0; i < 5; ++i) {
        lastTx = await callIncrementOnChain(await recoverInstance(lastTx))
    }
}

describe('Test SmartContract `Counter` on testnet using `syncState`', () => {
    it('should succeed', async () => {
        await main()
    })
})
