import { TestWallet, UTXO, WhatsonchainProvider } from 'scrypt-ts'
import { randomBytes } from 'crypto'
import { myPrivateKey } from './privateKey'
import {
    Transaction,
    Script,
    PrivateKey,
    PublicKey,
    crypto,
    Networks,
} from 'bsv'
import axios from 'axios'

const API_PREFIX = 'https://api.whatsonchain.com/v1/bsv/test'

export const inputSatoshis = 10000

export const inputIndex = 0
export const outputIndex = 0

export const dummyUTXO = {
    txId: randomBytes(32).toString('hex'),
    outputIndex: 0,
    script: '', // placeholder
    satoshis: inputSatoshis,
}

export async function fetchUtxos(
    address: string = myPrivateKey.toAddress().toString()
): Promise<UTXO[]> {
    const url = `${API_PREFIX}/address/${address}/unspent`
    const { data: utxos } = await axios.get(url)
    return utxos.map((utxo: Record<string, unknown>) => ({
        txId: utxo.tx_hash,
        outputIndex: utxo.tx_pos,
        satoshis: utxo.value,
        script: Script.buildPublicKeyHashOut(address).toHex(),
    }))
}

export function newTx(utxos?: Array<UTXO>) {
    if (utxos) {
        return new Transaction().from(utxos)
    }
    return new Transaction().from(dummyUTXO)
}

export async function sendTx(tx: Transaction): Promise<string> {
    try {
        const { data: txid } = await axios.post(`${API_PREFIX}/tx/raw`, {
            txhex: tx.toString(),
        })
        return txid
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.log('sendTx error', error.response.data)
        }

        throw error
    }
}

export const sleep = async (seconds: number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({})
        }, seconds * 1000)
    })
}

export async function signAndSend(
    tx: Transaction,
    privKey: PrivateKey = myPrivateKey,
    autoChange = true
): Promise<Transaction> {
    if (autoChange) {
        tx.change(privKey.toAddress())
    }

    tx.sign(privKey).seal()

    try {
        await sendTx(tx)
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.log('\x1B[31sendTx error: ', error.response?.data)
        }
        throw error
    }

    return tx
}

export function randomPrivateKey() {
    const privateKey = PrivateKey.fromRandom('testnet')
    const publicKey = PublicKey.fromPrivateKey(privateKey)
    const publicKeyHash = crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const address = publicKey.toAddress()
    return [privateKey, publicKey, publicKeyHash, address] as const
}

export async function getTestnetSigner(privateKey?: PrivateKey | PrivateKey[]) {
    return new TestWallet(privateKey || myPrivateKey).connect(
        new WhatsonchainProvider(Networks.testnet)
    )
}

export const testnetDefaultSigner = getTestnetSigner()
