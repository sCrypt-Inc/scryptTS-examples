import { expect } from 'chai'
import { Auction } from '../../src/contracts/auction'
import { PubKeyHash, toHex, PubKey } from 'scrypt-ts'
import { dummyUTXO, inputSatoshis } from './util/txHelper'
import { PrivateKey, PublicKey, Transaction, crypto, Script } from 'bsv'

const privateKeyAuctioneer = PrivateKey.fromRandom('testnet')
const publicKeyAuctioneer = PublicKey.fromPrivateKey(privateKeyAuctioneer)

const privateKeyBidder = PrivateKey.fromRandom('testnet')
const publicKeyBidder = PublicKey.fromPrivateKey(privateKeyBidder)
const publicKeyHashBidder = crypto.Hash.sha256ripemd160(
    publicKeyBidder.toBuffer()
)

describe('Test SmartContract `Auction` on testnet', () => {
    before(async () => {
        await Auction.compile()
    })

    it('should pass Bid call', async () => {
        await bidCallTest()
    })

    it('should pass Close call', async () => {
        await closeCallTest()
    })
})

async function bidCallTest() {
    const privateKeyHighestBid = PrivateKey.fromRandom('testnet')
    const publicKeyHighestBid = PublicKey.fromPrivateKey(privateKeyHighestBid)
    const publicKeyHashHighestBid = crypto.Hash.sha256ripemd160(
        publicKeyHighestBid.toBuffer()
    )
    const addressHighestBid = privateKeyHighestBid.toAddress()

    const privateKeyAuctioneer = PrivateKey.fromRandom('testnet')
    const publicKeyAuctioneer = PublicKey.fromPrivateKey(privateKeyAuctioneer)

    const privateKeyNewBid = PrivateKey.fromRandom('testnet')
    const publicKeyNewBid = PublicKey.fromPrivateKey(privateKeyNewBid)
    const publicKeyHashNewBid = crypto.Hash.sha256ripemd160(
        publicKeyNewBid.toBuffer()
    )
    const addressNewBid = privateKeyNewBid.toAddress()

    const bid = inputSatoshis + 10000

    const FEE = 5000

    const payInputSatoshis = 200000

    const changeSatoshis = payInputSatoshis - bid - FEE

    const oneDayAgo = new Date('2020-01-03')
    // JS timestamps are in milliseconds so we divide by 1000 to get an UNIX timestamp
    const auctionDeadline = BigInt(Math.round(oneDayAgo.valueOf() / 1000))

    const auction = new Auction(
        PubKeyHash(toHex(publicKeyHashHighestBid)),
        PubKey(toHex(publicKeyAuctioneer)),
        auctionDeadline
    ).markAsGenesis()

    const initBalance = 10000

    const newInstance = auction.next()

    const outputIndex = 0
    const inputIndex = 0
    newInstance.bidder = PubKeyHash(toHex(publicKeyHashNewBid))

    const callTx: Transaction = new Transaction()
        .addDummyInput(auction.lockingScript, initBalance)
        .setOutput(outputIndex, () => {
            // bind contract & tx locking relation
            return new Transaction.Output({
                // use the locking script of newInstance, as the locking script of the new UTXO
                script: newInstance.lockingScript,
                satoshis: bid,
            })
        })
        .addOutput(
            new Transaction.Output({
                script: Script.buildPublicKeyHashOut(addressHighestBid),
                satoshis: inputSatoshis,
            })
        )
        .addOutput(
            new Transaction.Output({
                script: Script.buildPublicKeyHashOut(addressNewBid),
                satoshis: changeSatoshis,
            })
        )
        .setInputScript(inputIndex, (tx: Transaction) => {
            // bind contract & tx unlocking relation
            // use the cloned version because this callback will be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return auction.getUnlockingScript((cloned) => {
                // call previous counter's public method to get the unlocking script.
                cloned.unlockFrom = { tx, inputIndex }
                cloned.bid(
                    PubKeyHash(toHex(publicKeyHashNewBid)),
                    BigInt(bid),
                    BigInt(changeSatoshis)
                )
            })
        })
        .seal()

    const result = callTx.verifyInputScript(0)

    expect(result.success, result.error).to.eq(true)
}

async function closeCallTest() {
    const inputSatoshis = 1000
    const inputIndex = 0
    const auctionDeadline = 1673510000n
    const timeNow = 1673523720

    const instance = new Auction(
        PubKeyHash(toHex(publicKeyHashBidder)),
        PubKey(toHex(publicKeyAuctioneer)),
        auctionDeadline
    )

    const deployTx = instance.getDeployTx([dummyUTXO], inputSatoshis)

    const callTx = instance.getCallTxForClose(
        timeNow,
        privateKeyAuctioneer,
        deployTx
    )
    callTx.seal()

    const result = callTx.verifyInputScript(inputIndex)
    expect(result.success, result.error).to.eq(true)
}
