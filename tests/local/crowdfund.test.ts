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
    ).markAsGenesis();

    const deployTx = crowdfund.getDeployTx(utxos, 1000);

    let prevTx = deployTx;
    let prevInstance = crowdfund;

    const newCrowdFund = prevInstance.next();

    const callTx = prevInstance.getCallTx(utxos, prevTx, newCrowdFund);

    let result = callTx.verifyInputScript(0);

    expect(result.success, result.error).to.eq(true);
  });
});
