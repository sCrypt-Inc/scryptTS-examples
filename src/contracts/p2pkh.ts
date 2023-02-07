import {
    assert,
    hash160,
    method,
    prop,
    PubKey,
    PubKeyHash,
    Sig,
    SmartContract,
    toHex,
    UTXO,
} from 'scrypt-ts'

import { Transaction, PublicKey, PrivateKey } from 'bsv'

export class P2PKH extends SmartContract {
    // Address of the recipient.
    @prop()
    readonly pubKeyHash: PubKeyHash

    constructor(pubKeyHash: PubKeyHash) {
        super(...arguments)
        this.pubKeyHash = pubKeyHash
    }

    @method()
    public unlock(sig: Sig, pubkey: PubKey) {
        // Check if the passed public key belongs to the specified address.
        assert(
            hash160(pubkey) == this.pubKeyHash,
            'public key hashes are not equal'
        )
        // Check the signatures validity.
        assert(this.checkSig(sig, pubkey), 'signature check failed')
    }

    // Local method to construct deployment TX.
    getDeployTx(utxos: UTXO[], initBalance: number): Transaction {
        const tx = new Transaction().from(utxos).addOutput(
            new Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            })
        )
        this.lockTo = { tx, outputIndex: 0 }
        return tx
    }

    // Local method to construct TX calling a deployed contract.
    getCallTx(
        pubKey: PublicKey,
        privateKey: PrivateKey,
        prevTx: Transaction
    ): Transaction {
        const inputIndex = 0
        return new Transaction().addInputFromPrevTx(prevTx).setInputScript(
            {
                inputIndex,
                privateKey,
            },
            (tx) => {
                const sig = tx.getSignature(inputIndex)
                this.unlockFrom = { tx, inputIndex }
                return this.getUnlockingScript((self) => {
                    self.unlock(Sig(sig as string), PubKey(toHex(pubKey)))
                })
            }
        )
    }
}
