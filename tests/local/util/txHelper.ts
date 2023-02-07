import { UTXO } from 'scrypt-ts'
import { randomBytes } from 'crypto'
import { PrivateKey, PublicKey, crypto, Transaction } from 'bsv'

export const inputSatoshis = 10000

export const inputIndex = 0

export const dummyUTXO = {
    txId: randomBytes(32).toString('hex'),
    outputIndex: 0,
    script: '', // placeholder
    satoshis: inputSatoshis,
}

export function newTx(utxos?: Array<UTXO>) {
    if (utxos) {
        return new Transaction().from(utxos)
    }
    return new Transaction().from(dummyUTXO)
}

export function randomPrivateKey() {
    const privateKey = PrivateKey.fromRandom('testnet')
    const publicKey = PublicKey.fromPrivateKey(privateKey)
    const publicKeyHash = crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const address = publicKey.toAddress()
    return [privateKey, publicKey, publicKeyHash, address] as const
}
