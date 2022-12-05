import { method, prop, SmartContract, assert, SigHashPreimage, SigHash, bsv } from "scrypt-ts";
import { newTx, signAndSend } from "../txHelper";
import { UtxoManager } from "../utxoManager";

export class Counter extends SmartContract {
  @prop(true)
  count: bigint;

  constructor(count: bigint) {
    super(count);
    this.count = count;
  }

  @method
  public increment(txPreimage: SigHashPreimage, amount: bigint) {
    this.count++;
    assert(this.updateState(txPreimage, amount));
  }

  async deploy(satoshis: number, utxoMgr: UtxoManager) {

    // 1. Get the available utxos for the privatekey
    // const utxos = await fetchUtxos();
    const utxos = await utxoMgr.getUtxos();

    // 2. Construct a transaction: the input of which is the acquired utxos, and the first output of the transaction contains the lockingScript corresponding to the Demo contract
    this.markAsGenesis()
    const tx = newTx(utxos);
    tx.addOutput(new bsv.Transaction.Output({
      script: this.lockingScript,
      satoshis: satoshis,
    }));

    // 3. Sign and broadcast transaction with privatekey
    const signedTx = await signAndSend(tx);

    // Collect the new p2pkh utxo if it exists
    utxoMgr.collectUtxoFrom(signedTx);

    return signedTx;
  }


  async callIncrement(prevTx: bsv.Transaction, utxoMgr: UtxoManager) {
    const inputIndex = 0;
    let tx: bsv.Transaction = new bsv.Transaction()
      .addInputFromPrevTx(prevTx)
      .setOutput(0, (tx: bsv.Transaction) => {
        const newCounter = this.next()
        newCounter.count++
        newCounter.lockTo = { tx, outputIndex: 0 };
        return new bsv.Transaction.Output({
          script: newCounter.lockingScript,
          satoshis: tx.inputAmount - tx.getEstimateFee(),
        })
      })
      .setInputScript({ inputIndex }, (tx: bsv.Transaction) => {
        return this.getUnlockingScript((self) => {
          // call previous demo's public method to get the unlocking script.
          self.unlockFrom = { tx, inputIndex }
          self.increment(new SigHashPreimage(tx.getPreimage(0)), BigInt(tx.getOutputAmount(0)))
        })
      })

    const signedTx = await signAndSend(tx);

    // Collect the new p2pkh utxo if it exists
    utxoMgr.collectUtxoFrom(signedTx);

    return signedTx;
  }
}
