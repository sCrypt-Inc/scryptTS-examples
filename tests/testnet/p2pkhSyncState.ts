import { P2PKH } from '../../src/contracts/p2pkh'
import { getDefaultSigner, inputSatoshis } from './util/txHelper'
import { myPublicKey, myPublicKeyHash } from '../util/privateKey'

import {
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
    bsv,
} from 'scrypt-ts'

let deployTx: bsv.Transaction
const atOutputIndex = 0

async function deploy() {
    await P2PKH.compile()
    const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))
    await p2pkh.connect(getDefaultSigner())

    deployTx = await p2pkh.deploy(inputSatoshis)
    console.log('P2PKH contract deployed: ', deployTx.id)
}

async function call() {
    // create an instance with the same constructor arguments as when deploying the contract
    const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))
    // sync state from tx
    p2pkh.syncState(deployTx, atOutputIndex)

    await p2pkh.connect(getDefaultSigner())

    console.log('Recovered')

    const { tx } = await p2pkh.methods.unlock(
        (sigResps) => findSig(sigResps, myPublicKey),
        PubKey(toHex(myPublicKey)),
        {
            pubKeyOrAddrToSign: myPublicKey,
        } as MethodCallOptions<P2PKH>
    )
    console.log('P2PKH contract called: ', tx.id)
}

describe('Test SmartContract `P2PKH` on testnet with `syncState`', () => {
    it('should succeed', async () => {
        await deploy()
        await call()
    })
})
