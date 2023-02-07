import { method, prop, SmartContract, assert, UTXO } from 'scrypt-ts'
import { Transaction } from 'bsv'

export class CheckLockTimeVerify extends SmartContract {
    public static readonly LOCKTIME_BLOCK_HEIGHT_MARKER = 500000000

    @prop()
    matureTime: bigint // Can be a timestamp or block height.

    constructor(matureTime: bigint) {
        super(matureTime)
        this.matureTime = matureTime
    }

    @method()
    public unlock() {
        // Ensure nSequence is less than UINT_MAX.
        assert(this.ctx.sequence < 0xffffffffn)

        // Check if using block height.
        if (
            this.matureTime < CheckLockTimeVerify.LOCKTIME_BLOCK_HEIGHT_MARKER
        ) {
            // Enforce nLocktime field to also use block height.
            assert(
                this.ctx.locktime <
                    CheckLockTimeVerify.LOCKTIME_BLOCK_HEIGHT_MARKER
            )
        }
        assert(this.ctx.locktime >= this.matureTime)
    }

    // Local method to construct deployment TX.
    getDeployTx(utxos: UTXO[], satoshis: number): Transaction {
        return new Transaction().from(utxos).addOutput(
            new Transaction.Output({
                script: this.lockingScript,
                satoshis: satoshis,
            })
        )
    }

    // Local method to construct TX that calls deployed contract.
    getCallTxForUnlock(timeNow: number, prevTx: Transaction): Transaction {
        const inputIndex = 0
        let callTx: Transaction = new Transaction().addInputFromPrevTx(prevTx)

        callTx.setLockTime(timeNow)
        callTx.setInputSequence(inputIndex, 0)

        callTx = callTx.setInputScript(inputIndex, (tx: Transaction) => {
            return this.getUnlockingScript((cloned) => {
                // Call cloned contract's public method to get the unlocking script.
                cloned.unlockFrom = { tx, inputIndex }
                cloned.ctx.locktime = BigInt(timeNow)
                cloned.ctx.sequence = 0n
                cloned.unlock()
            })
        })

        return callTx
    }
}
