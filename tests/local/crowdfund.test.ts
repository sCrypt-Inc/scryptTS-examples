import { expect } from "chai";
import {
  SigHashPreimage,
  bsv,
  Ripemd160,
  PubKey,
  toHex,
  buildPublicKeyHashScript,
  PubKeyHash,
} from "scrypt-ts";
import { Crowdfund } from "../../src/contracts/crowdfund";
import { dummyUTXO } from "./util/txHelper";

describe.only("Test SmartContract `Crowdfund`", () => {
  before(async () => {
    await Crowdfund.compile();
  });

  it("should pass the public method unit test successfully.", async () => {
    const utxos = [dummyUTXO];

    const privateKeyRecepient = bsv.PrivateKey.fromRandom("testnet");
    const publicKeyRecepient =
      bsv.PublicKey.fromPrivateKey(privateKeyRecepient);
    const publicKeyHashRecepient = bsv.crypto.Hash.sha256ripemd160(
      publicKeyRecepient.toBuffer()
    );

    const privateKeyContributor = bsv.PrivateKey.fromRandom("testnet");
    const publicKeyContributor = bsv.PublicKey.fromPrivateKey(
      privateKeyContributor
    );
    const publicKeyHashContributor = bsv.crypto.Hash.sha256ripemd160(
      publicKeyContributor.toBuffer()
    );

    const onedayAgo = new Date("2020-01-03");
    const auctionDeadline = BigInt(Math.round(onedayAgo.valueOf() / 1000));

    const target = BigInt(1000);

    const crowdfund = new Crowdfund(
      PubKeyHash(toHex(publicKeyHashRecepient)),
      PubKey(toHex(publicKeyContributor)),
      auctionDeadline,
      target
    );

    let newInstance = crowdfund.next();

    const initBalance = 5000;
    const outputIndex = 0;
    const inputIndex = 0;

    let callTx: bsv.Transaction = new bsv.Transaction()
      .addDummyInput(crowdfund.lockingScript, initBalance)
      .setOutput(outputIndex, (tx: bsv.Transaction) => {
        // bind contract & tx locking relation
        return new bsv.Transaction.Output({
          // use newInstance's lockingscript as the new UTXO's lockingscript
          script: buildPublicKeyHashScript(
            PubKeyHash(toHex(publicKeyRecepient))
          ),
          satoshis: 1,
        });
      })
      .addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(
            privateKeyRecepient.toAddress()
          ),
          satoshis: 1000,
        })
      )
      .setInputScript(
        {
          inputIndex,
        },
        (tx: bsv.Transaction) => {
          // bind contract & tx unlocking relation
          // use the cloned version bcoz this callback will be executed multiple times during tx building process,
          // and calling contract method may have side effects on its properties.
          return crowdfund.getUnlockingScript((cloned) => {
            // call previous counter's public method to get the unlocking script.
            cloned.unlockFrom = { tx, inputIndex };
            cloned.collect(SigHashPreimage(tx.getPreimage(inputIndex)), 2000n);
          });
        }
      )
      .seal();

    let result = callTx.verifyInputScript(0);

    expect(result.success, result.error).to.eq(true);

    // crowdfund.verify((self) => {
    //   self.collect();

    // // construct a transaction for deployment
    // const deployTx = crowdfund.getDeployTx(utxos, 1);

    // let prevTx = deployTx;
    // let prevInstance = counter;

    // // multiple calls
    // for (let i = 0; i < 3; i++) {
    //   // 1. build a new contract instance
    //   const newCounter = prevInstance.next();
    //   // 2. apply the updates on the new instance.
    //   newCounter.count++;
    //   // 3. construct a transaction for contract call
    //   const callTx = prevInstance.getCallTx(utxos, prevTx, newCounter);
    //   // 4. run `verify` method on `prevInstance`
    //   const result = prevInstance.verify((self) => {
    //     self.increment();
    //   });

    //   expect(result.success, result.error).to.be.true;

    //   // prepare for the next iteration
    //   prevTx = callTx;
    //   prevInstance = newCounter;
    // }
  });
});
