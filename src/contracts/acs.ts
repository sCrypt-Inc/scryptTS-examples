import {
    assert,
    buildPublicKeyHashScript,
    ByteString,
    hash256,
    method,
    prop,
    PubKeyHash,
    SigHash,
    SmartContract,
    Utils,
    UTXO,
} from 'scrypt-ts'

import { Transaction, crypto } from 'bsv'

export class AnyoneCanSpend extends SmartContract {
    // Address of the recipient.
    @prop()
    pubKeyHash: PubKeyHash

    constructor(pubKeyHash: PubKeyHash) {
        super(...arguments)
        this.pubKeyHash = pubKeyHash
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public unlock(outputAmount: bigint) {
        const lockingScript: ByteString = Utils.buildPublicKeyHashScript(
            this.pubKeyHash
        )
        const output: ByteString = Utils.buildOutput(
            lockingScript,
            outputAmount
        )
        assert(
            hash256(output) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
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
    // Due to our choice of SIGHASH flags, anyone can add an extra
    // input to the transaction.
    getCallTx(prevTx: Transaction, changeAddress: PubKeyHash): Transaction {
        const inputIndex = 0
        return new Transaction()
            .addInputFromPrevTx(prevTx)
            .setOutput(0, (tx) => {
                return new Transaction.Output({
                    script: buildPublicKeyHashScript(changeAddress),
                    satoshis: tx.inputAmount - tx.getChangeAmount(),
                })
            })
            .setInputScript(
                {
                    inputIndex,
                    sigtype: crypto.Signature.ANYONECANPAY_SINGLE,
                },
                (tx) => {
                    this.unlockFrom = { tx, inputIndex }
                    return this.getUnlockingScript((self) => {
                        self.unlock(BigInt(tx.getOutputAmount(0)))
                    })
                }
            )
    }
}
