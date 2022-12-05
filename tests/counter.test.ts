import { Counter } from '../contracts/counter';
import { dummyUTXO } from '../txHelper';
import { bsv, SigHashPreimage } from 'scrypt-ts'
import { expect } from 'chai';

describe('Test SmartContract `Counter`', () => {

  before(async () => {
    await Counter.compile();
  })

  it('should pass the public method unit test successfully.', async () => {
    const balance = 1000;
    const counter = new Counter(0n).markAsGenesis();

    const deployTx = new bsv.Transaction().from(dummyUTXO)
      .addOutput(new bsv.Transaction.Output({
        script: counter.lockingScript,
        satoshis: balance,
      }));
    counter.lockTo = { tx: deployTx, outputIndex: 0 };

    let prevTx = deployTx;
    let prevInstance = counter;
    for (let i = 0; i < 3; i++) {
      const newCounter = prevInstance.next();
      newCounter.count++;

      const inputIndex = 0;
      const callTx: bsv.Transaction = new bsv.Transaction()
        .addInputFromPrevTx(prevTx)
        .setOutput(0, (tx: bsv.Transaction) => {
          newCounter.lockTo = { tx, outputIndex: 0 };
          return new bsv.Transaction.Output({
            script: newCounter.lockingScript,
            satoshis: balance,
          })
        })
        .setInputScript({ inputIndex }, (tx: bsv.Transaction) => {
          prevInstance.unlockFrom = { tx, inputIndex };
          return prevInstance.getUnlockingScript((self) => {
            self.increment(new SigHashPreimage(tx.getPreimage(0)), BigInt(tx.getOutputAmount(0)));
          })
        });

      const result = callTx.verifyInputScript(0)
      expect(result.success, result.error).to.be.true;

      prevTx = callTx;
      prevInstance = newCounter;
    }

  })
})