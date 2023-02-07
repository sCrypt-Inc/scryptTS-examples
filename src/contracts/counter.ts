import {
    SigHash,
    assert,
    hash256,
    method,
    prop,
    SmartContract,
    UTXO,
} from 'scrypt-ts'

import { Transaction, crypto } from 'bsv'

export class Counter extends SmartContract {
    // Stateful prop to store counters value.
    @prop(true)
    count: bigint

    // Current balance of the contract. This is only stored locally.
    private balance: number

    constructor(count: bigint) {
        super(...arguments)
        this.count = count
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public increment() {
        // Increment counter value
        this.count++

        // Ensure next output will contain the updated counter value.
        // I.e. actual output hash matches the one in the tx context.
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }

    // Local method to construct deployment TX.
    getDeployTx(utxos: UTXO[], initBalance: number): Transaction {
        this.balance = initBalance
        const tx = new Transaction().from(utxos).addOutput(
            new Transaction.Output({
                script: this.lockingScript,
                satoshis: initBalance,
            })
        )
        this.lockTo = { tx, outputIndex: 0 }
        return tx
    }

    // Local method to construct TX calling deployed smart contract.
    getCallTx(
        utxos: UTXO[],
        prevTx: Transaction,
        nextInst: Counter
    ): Transaction {
        const inputIndex = 0
        return new Transaction()
            .addInputFromPrevTx(prevTx)
            .from(utxos)
            .setOutput(0, (tx: Transaction) => {
                nextInst.lockTo = { tx, outputIndex: 0 }
                return new Transaction.Output({
                    script: nextInst.lockingScript,
                    satoshis: this.balance,
                })
            })
            .setInputScript(
                {
                    inputIndex,
                    sigtype: crypto.Signature.ANYONECANPAY_SINGLE,
                },
                (tx: Transaction) => {
                    this.unlockFrom = { tx, inputIndex }
                    return this.getUnlockingScript((self) => {
                        self.increment()
                    })
                }
            )
    }
}
