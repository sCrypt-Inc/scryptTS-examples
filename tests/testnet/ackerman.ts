import { getTestnetSigner, inputSatoshis } from './util/txHelper'
import { Ackermann } from '../../src/contracts/ackermann'

async function main() {
    await Ackermann.compile()
    const ackermann = new Ackermann(2n, 1n)

    // connect to a signer
    await ackermann.connect(getTestnetSigner())

    // contract deploy
    const deployTx = await ackermann.deploy(inputSatoshis)
    console.log('Ackermann contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await ackermann.methods.unlock(5n)
    console.log('Ackermann contract called: ', callTx.id)
}

main().catch((e) => {
    console.log('error', e.message)
})
