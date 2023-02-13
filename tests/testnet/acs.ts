import { AnyoneCanSpend } from '../../src/contracts/acs'
import { getTestnetSigner, inputSatoshis } from './util/txHelper'
import { PubKeyHash, toHex } from 'scrypt-ts'
import { myPublicKeyHash } from '../util/privateKey'

async function main() {
    await AnyoneCanSpend.compile()
    const anyoneCanSpend = new AnyoneCanSpend(
        PubKeyHash(toHex(myPublicKeyHash))
    )

    // connect to a signer
    await anyoneCanSpend.connect(getTestnetSigner())

    // contract deployment
    const deployTx = await anyoneCanSpend.deploy(inputSatoshis)
    console.log('AnyoneCanSpend contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await anyoneCanSpend.methods.unlock()
    console.log('AnyoneCanSpend contract called: ', callTx.id)
}

main().catch((e) => {
    console.log('error', e.message)
})
