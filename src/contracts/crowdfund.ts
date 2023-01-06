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
  public collect(raisedAmount: bigint) {
    // reach target
    assert(raisedAmount >= this.target);

    // fund goes to the recepient
    const lockingScript = Utils.buildPublicKeyHashScript(this.recepient);

    const output = Utils.buildOutput(lockingScript, raisedAmount);

    assert(
      this.ctx.hashOutputs ==
        hash256(this.buildStateOutput(this.ctx.utxo.value))
    );
  }

  @method()
  public refund(sig: Sig, txPreimage: SigHashPreimage) {
    assert(this.checkPreimage(txPreimage));

    // fundraising expired
    assert(SigHash.nLocktime(txPreimage) >= this.deadline);

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
    const inputIndex = 1;
    return new bsv.Transaction()
      .from(utxos)
      .addInputFromPrevTx(prevTx)
      .setOutput(0, (tx: bsv.Transaction) => {
        nextInst.lockTo = { tx, outputIndex: 0 };
        return new bsv.Transaction.Output({
          script: nextInst.lockingScript,
          satoshis: this.balance,
        });
      })
      .setInputScript(inputIndex, (tx: bsv.Transaction) => {
        this.unlockFrom = { tx, inputIndex };
        return this.getUnlockingScript((self) => {
          self.collect(BigInt(this.balance));
        });
      });
  }
}
