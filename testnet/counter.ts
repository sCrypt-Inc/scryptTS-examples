import { Counter } from '../contracts/counter';
import { getUtxoManager } from '../utxoManager';

async function main() {
  await Counter.compile();

  const uxtoMgr = await getUtxoManager();


  let counter = new Counter(0n);

  const deployTx = await counter.deploy(1000, uxtoMgr);

  console.log('Counter contract deployed: ', deployTx.id)

  let prevTx = deployTx;
  for (let i = 0; i < 3; i++) {
    const { calledTx, counter: newCounter } = await counter.callIncrement(prevTx, uxtoMgr);
    counter = newCounter
    prevTx = calledTx;
    console.log('Counter contract called: ', calledTx.id)
  }

}


describe('Test SmartContract `Counter` on testnet', () => {
  it('should success', async () => {
    await main();
  })
})