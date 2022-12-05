import { Counter } from '../contracts/counter';
import { getUtxoManager } from '../utxoManager';

async function main() {
  await Counter.compile();

  const uxtoMgr = await getUtxoManager();


  let counter = new Counter(0n);

  const deployTx = await counter.deploy(3000, uxtoMgr);

  console.log('Counter contract deployed: ', deployTx.id)

  const calledTx = await counter.callIncrement(deployTx, uxtoMgr);

  console.log('Counter contract called: ', calledTx.id)


  // const utxoMgr = await getUtxoManager();

  // const balance = 1;
  // const counter = new Counter(0n).markAsGenesis();

  // const utxos = await utxoMgr.getUtxos();
  // const unsignedDeployTx =
  //   new bsv.Transaction().from(utxos)
  //     .addOutput(new bsv.Transaction.Output({
  //       script: counter.lockingScript,
  //       satoshis: balance,
  //     }));
  // const deployTx = await signAndSend(unsignedDeployTx);
  // console.log('Counter deploy tx:', deployTx.id);

  // // collect the new p2pkh utxo if it exists in `deployTx`
  // utxoMgr.collectUtxoFrom(deployTx);

  // counter.lockTo = { tx: deployTx, outputIndex: 0 };

  // let prevTx = deployTx;
  // let prevInstance = counter;
  // for (let i = 0; i < 3; i++) {
  //   const newCounter = prevInstance.next();
  //   newCounter.count++;

  //   // fee in satoshis for `callTx`, can be estimated in local tests by calling `tx.getEstimateFee()`.
  //   const fee = 230;
  //   const utxos = await utxoMgr.getUtxos(fee);

  //   const inputIndex = 1;
  //   const unsignedCallTx =
  //     new bsv.Transaction().from(utxos)
  //       .addInputFromPrevTx(prevTx)
  //       .setOutput(0, (tx: bsv.Transaction) => {
  //         newCounter.lockTo = { tx, outputIndex: 0 };
  //         return new bsv.Transaction.Output({
  //           script: newCounter.lockingScript,
  //           satoshis: balance,
  //         })
  //       })
  //       .setInputScript(inputIndex, (tx: bsv.Transaction, prevOutput: bsv.Transaction.Output) => {
  //         prevInstance.unlockFrom = { tx, inputIndex };
  //         const prevInstance_ = prevInstance.clone();
  //         const preimage = getPreimage(tx, prevOutput.script, prevOutput.satoshis, inputIndex)
  //         return prevInstance_.getUnlockingScript(() => {
  //           prevInstance_.increment(preimage);
  //         })
  //       });

  //   const callTx = await signAndSend(unsignedCallTx, privateKey, false);
  //   console.log('Counter call tx: ', callTx.id, ', count updated to: ', newCounter.count);

  //   prevTx = callTx;
  //   prevInstance = newCounter;
}


describe('Test SmartContract `Counter` on testnet', () => {
  it('should success', async () => {
    await main();
  })
})