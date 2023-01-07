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

  // @method()
  // public collect(raisedAmount: bigint) {
  //   // reach target
  //   assert(raisedAmount >= this.target);

  //   // fund goes to the recepient
  //   const lockingScript = Utils.buildPublicKeyHashScript(this.recepient);

  //   const output = Utils.buildOutput(
  //     lockingScript,
  //     this.ctx.utxo.value + raisedAmount
  //   );

  //   assert(this.ctx.hashOutputs == hash256(output));
  // }

  @method()
  public pledge(raisedAmount: bigint) {
    // reach target
    assert(raisedAmount >= this.target);

    // fund goes to the recipient
    const lockingScript = Utils.buildPublicKeyHashScript(this.recepient);

    console.log("here is the lockingscript ", lockingScript);

    const output = Utils.buildOutput(lockingScript, raisedAmount);

    console.log("here is the output ", output);

    console.log("here is the hashoutputs ", this.ctx.hashOutputs);

    console.log("here is the hash256(output) ", hash256(output));

    assert(hash256(output) == this.ctx.hashOutputs);
  }

  @method()
  public refund(sig: Sig) {
    // fundraising expired
    assert(this.ctx.nLocktime >= this.deadline);

    assert(this.checkSig(sig, this.contributor));
  }
  private balance: number;

  getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
    this.balance = initBalance;
    const tx = new bsv.Transaction().from(utxos).addOutput(
      new bsv.Transaction.Output({
        script: this.lockingScript,
        satoshis: initBalance,
      })
    );
    this.lockTo = { tx, outputIndex: 0 };
    return tx;
  }

  getCallTx(
    utxos: UTXO[],
    prevTx: bsv.Transaction,
    nextInst: Crowdfund
  ): bsv.Transaction {
    const inputIndex = 0;
    return new bsv.Transaction()
      .addInputFromPrevTx(prevTx)
      .from(utxos)
      .setOutput(0, (tx: bsv.Transaction) => {
        nextInst.lockTo = { tx, outputIndex: 0 };
        return new bsv.Transaction.Output({
          script: nextInst.lockingScript,
          satoshis: tx.getInputAmount(inputIndex),
        });
      })
      .setInputScript(
        {
          inputIndex,
          sigtype:
            bsv.crypto.Signature.SIGHASH_ANYONECANPAY |
            bsv.crypto.Signature.SIGHASH_SINGLE |
            bsv.crypto.Signature.SIGHASH_FORKID,
        },
        (tx) => {
          this.unlockFrom = { tx, inputIndex };
          return this.getUnlockingScript((self) => {
            self.pledge(1000n);
          });
        }
      );
  }
}
