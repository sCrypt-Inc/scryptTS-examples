import {
  SmartContract,
  method,
  prop,
  assert,
  PubKeyHash,
  PubKey,
  SigHashPreimage,
  Tx,
  toHex,
  Utils,
  hash256,
  SigHash,
  Sig,
  bsv,
  UTXO,
} from "scrypt-ts";

export class Crowdfund extends SmartContract {
  @prop()
  recepient: PubKeyHash;

  @prop()
  contributor: PubKey;

  @prop()
  deadline: bigint;

  @prop()
  target: bigint;

  constructor(
    recepient: PubKeyHash,
    contributor: PubKey,
    deadline: bigint,
    target: bigint
  ) {
    super(recepient, contributor, deadline, target);
    this.recepient = recepient;
    this.contributor = contributor;
    this.deadline = deadline;
    this.target = target;
  }

  @method()
  public collect(txPreimage: SigHashPreimage, raisedAmount: bigint) {
    assert(this.checkPreimage(txPreimage));

    // reach target
    assert(raisedAmount >= this.target);

    // fund goes to the recepient
    const lockingScript = Utils.buildPublicKeyHashScript(this.recepient);

    const output = Utils.buildOutput(lockingScript, raisedAmount);

    assert(hash256(output) === SigHash.hashOutputs(txPreimage));
  }

  @method()
  public refund(sig: Sig, txPreimage: SigHashPreimage) {
    assert(this.checkPreimage(txPreimage));

    // fundraising expired
    assert(SigHash.nLocktime(txPreimage) >= this.deadline);

    assert(this.checkSig(sig, this.contributor));
  }

  getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
    const tx = new bsv.Transaction().from(utxos).addOutput(
      new bsv.Transaction.Output({
        script: this.lockingScript,
        satoshis: initBalance,
      })
    );
    this.lockTo = { tx, outputIndex: 0 };
    return tx;
  }

  //   getCallTxForCollect(
  //     pubKeys: bsv.PublicKey[],
  //     privateKey: bsv.PrivateKey[],
  //     prevTx: bsv.Transaction
  //   ): bsv.Transaction {
  //     const inputIndex = 0;
  //     return new bsv.Transaction().addInputFromPrevTx(prevTx).setInputScript(
  //       {
  //         inputIndex,
  //         privateKey,
  //       },
  //       (tx) => {
  //         const sigs = tx.getSignature(inputIndex);

  //         this.unlockFrom = { tx, inputIndex };

  //         return this.getUnlockingScript((self) => {
  //           self.collect(
  //             [
  //               PubKey(toHex(pubKeys[0])),
  //               PubKey(toHex(pubKeys[1])),
  //               PubKey(toHex(pubKeys[2])),
  //             ],
  //             [Sig(sigs[0]), Sig(sigs[1]), Sig(sigs[2])],
  //             [true, true, true]
  //           );
  //         });
  //       }
  //     );
  //   }
}
