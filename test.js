"use strict";

const assert = require('chai').assert;

const utils = require('./utils.js');

const Block = require('./block.js');
const Blockchain = require('./blockchain.js');
const Client = require('./client.js');
const Miner = require('./miner.js');
const Transaction = require('./transaction.js');
const merkle = require('./merkle.js');

// Generating keypair for multiple test cases, since key generation is slow.
const kp = utils.generateKeypair();
let addr = utils.calcAddress(kp.public);

// Adding a POW target that should be trivial to match.
const EASY_POW_TARGET = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

// Setting blockchain configuration.  (Usually this would be done during the creation of the genesis block.)
Blockchain.createInstance({ blockClass: Block, transactionClass: Transaction });

describe('utils', () => {
  describe('.verifySignature', () => {
    let sig = utils.sign(kp.private, "hello");
    it('should accept a valid signature', () => {
      assert.ok(utils.verifySignature(kp.public, "hello", sig));
    });

    it('should reject an invalid signature', () => {
      assert.ok(!utils.verifySignature(kp.public, "goodbye", sig));
    });
  });
});

describe("Transaction", () => {
  let outputs = [{amount: 20, address: "ffff"},
                 {amount: 40, address: "face"}];
  let t = new Transaction({from: addr, pubKey: kp.public, outputs: outputs, fee: 1, nonce: 1});
  t.sign(kp.private);

  describe("#totalOutput", () => {
    it('should sum up all of the outputs and the transaction fee', () => {
      assert.equal(t.totalOutput(), 61);
    });
  });

});

describe('Block', () => {
  let prevBlock = new Block("8e7912");
  prevBlock.balances = new Map([ [addr, 500], ["ffff", 100], ["face", 99] ]);

  let outputs = [{amount: 20, address: "ffff"}, {amount: 40, address: "face"}];
  let t = new Transaction({from: addr, pubKey: kp.public, outputs: outputs, fee: 1, nonce: 0});

  describe('#addTransaction', () => {
    it("should fail if a transaction is not signed.", () => {
      let b = new Block(addr, prevBlock);
      let tx = new Transaction(t);
      assert.isFalse(b.addTransaction(tx));
    });

    it("should fail if the 'from' account does not have enough gold.", () => {
      let b = new Block(addr, prevBlock);
      let tx = new Transaction(t);
      tx.outputs = [{amount:20000000000000, address: "ffff"}];
      tx.sign(kp.private);
      assert.isFalse(b.addTransaction(tx));
    });

    it("should transfer gold from the sender to the receivers.", () => {
      let b = new Block(addr, prevBlock);
      let tx = new Transaction(t);
      tx.sign(kp.private);
      b.addTransaction(tx);
      assert.equal(b.balances.get(addr), 500-61); // Extra 1 for transaction fee.
      assert.equal(b.balances.get("ffff"), 100+20);
      assert.equal(b.balances.get("face"), 99+40);
    });

    it("should ignore any transactions that were already received in a previous block.", () => {
      let b = new Block(addr, prevBlock);
      let tx = new Transaction(t);
      tx.sign(kp.private);
      b.addTransaction(tx);

      // Attempting to add transaction to subsequent block.
      let b2 = new Block(addr, b);
      b2.addTransaction(tx);
      assert.isEmpty(b2.transactions);
    });

    // Merkle / miner extension: finite block matches Blockchain.MAX_BLOCK_TRANSACTIONS.
    it(`should reject txs beyond MAX_BLOCK_TRANSACTIONS (${Blockchain.MAX_BLOCK_TRANSACTIONS})`, () => {
      let b = new Block(addr, prevBlock);
      for (let n = 0; n < Blockchain.MAX_BLOCK_TRANSACTIONS; n++) {
        let tx = new Transaction({
          from: addr,
          pubKey: kp.public,
          outputs: [{ amount: 1, address: 'face' }],
          fee: 1,
          nonce: n,
        });
        tx.sign(kp.private);
        assert.isTrue(b.addTransaction(tx), `expected tx ${n} to be accepted`);
      }
      let overflow = new Transaction({
        from: addr,
        pubKey: kp.public,
        outputs: [{ amount: 1, address: 'face' }],
        fee: 1,
        nonce: Blockchain.MAX_BLOCK_TRANSACTIONS,
      });
      overflow.sign(kp.private);
      assert.isFalse(b.addTransaction(overflow));
    });
  });

  describe('#rerun', () => {
    it("should redo transactions to return to the same block.", () => {
      let b = new Block(addr, prevBlock);

      let tx = new Transaction(t);
      tx.sign(kp.private);
      b.addTransaction(tx);

      // Wiping out balances and then rerunning the block
      b.balances = new Map();
      b.rerun(prevBlock);

      // Verifying prevBlock's balances are unchanged.
      assert.equal(prevBlock.balances.get(addr), 500);
      assert.equal(prevBlock.balances.get("ffff"), 100);
      assert.equal(prevBlock.balances.get("face"), 99);

      // Verifying b's balances are correct.
      assert.equal(b.balances.get(addr), 500-61);
      assert.equal(b.balances.get("ffff"), 100+20);
      assert.equal(b.balances.get("face"), 99+40);
    });

    it("should take a serialized/deserialized block and get back the same block.", () => {
      let b = new Block(addr, prevBlock);

      let tx = new Transaction(t);
      tx.sign(kp.private);
      b.addTransaction(tx);

      let hash = b.hashVal();

      let serialBlock = b.serialize();
      let o = JSON.parse(serialBlock);
      let b2 = Blockchain.deserializeBlock(o);
      b2.rerun(prevBlock);

      // Verify hashes still match
      assert.equal(b2.hashVal(), hash);

      assert.equal(b2.balances.get(addr), 500-61);
      assert.equal(b2.balances.get("ffff"), 100+20);
      assert.equal(b2.balances.get("face"), 99+40);
    });
  });

  describe('#getMerkleProof', () => {
    it("should create and verify an O(log N) merkle proof for a tx", () => {
      let b = new Block(addr, prevBlock);
      let tx = new Transaction(t);
      tx.sign(kp.private);
      b.addTransaction(tx);

      const proof = b.getMerkleProof(tx);
      assert.isNotNull(proof);
      assert.isTrue(Block.verifyMerkleProof(proof));
      assert.equal(proof.root, b.getMerkleRoot());
    });
  });

});

describe('Merkle mutation rule', () => {
  it("should mark mutated when odd-level duplicates create identical tail pair", () => {
    // Two identical leaf hashes at the end triggers mutation detection.
    const a = merkle.leafHashFromTxId("a");
    const b = merkle.leafHashFromTxId("b");
    const { mutated } = merkle.buildRoot([a, b, b]);
    assert.isTrue(mutated);
  });
});

/**
 * Bitcoin-style odd-padding duplicates the last leaf hash.
 * A 3-tx tree becomes [h1,h2,h3,h3]; a 4-tx list that literally ends with two identical
 * leaf hashes is the same bottom layer — same Merkle root, different tx counts / semantics.
 * Real networks reject duplicate tx ids (and mutation flags) so two valid competing blocks
 * cannot exploit this ambiguity.
 */
describe('Merkle ambiguous roots (CVE-2012-2459 class intuition)', () => {
  it('two different leaf lists can produce the same Merkle root', () => {
    const h1 = merkle.leafHashFromTxId('tx-A');
    const h2 = merkle.leafHashFromTxId('tx-B');
    const h3 = merkle.leafHashFromTxId('tx-C');

    const threeLeaves = merkle.buildRoot([h1, h2, h3]);
    const fourLeavesDupTail = merkle.buildRoot([h1, h2, h3, h3]);

    assert.isFalse(threeLeaves.mutated);
    assert.isFalse(fourLeavesDupTail.mutated);
    assert.equal(threeLeaves.root, fourLeavesDupTail.root);
    assert.notDeepEqual([h1, h2, h3], [h1, h2, h3, h3]);
  });
});

describe('Client', () => {
  let genesis = new Block("8e7912");
  genesis.balances = new Map([ [addr, 500], ["ffff", 100], ["face", 99] ]);
  let net = { broadcast: function(){} };

  let outputs = [{amount: 20, address: "ffff"}, {amount: 40, address: "face"}];
  let t = new Transaction({from: addr, pubKey: kp.public, outputs: outputs, fee: 1, nonce: 0});
  t.sign(kp.private);

  let outputs2 = [{amount: 10, address: "face"}];
  let t2 = new Transaction({from: addr, pubKey: kp.public, outputs: outputs2, fee: 1, nonce: 1});
  t2.sign(kp.private);

  let clint = new Client({net: net, startingBlock: genesis});
  clint.log = function(){};

  let miner = new Miner({name: "Minnie", net: net, startingBlock: genesis});
  miner.log = function(){};

  describe('#receiveBlock', () => {
    it("should reject any block without a valid proof.", () => {
      let b = new Block(addr, genesis);
      b.addTransaction(t);
      // Receiving and verifying block
      b = clint.receiveBlock(b);
      assert.isNull(b);
    });

    it("should store all valid blocks, but only change lastBlock if the newer block is better.", () => {
      let b = new Block(addr, genesis, EASY_POW_TARGET);
      b.addTransaction(t);
      // Finding a proof.
      miner.currentBlock = b;
      b.proof = 0;
      miner.findProof(true);
      // Receiving and verifying block
      clint.receiveBlock(b);
      assert.equal(clint.blocks.get(b.id), b);
      assert.equal(clint.lastBlock, b);

      let b2 = new Block(addr, b, EASY_POW_TARGET);
      b2.addTransaction(t2);
      // Finding a proof.
      miner.currentBlock = b2;
      b2.proof = 0;
      miner.findProof(true);
      // Receiving and verifying block
      clint.receiveBlock(b2);
      assert.equal(clint.blocks.get(b2.id), b2);
      assert.equal(clint.lastBlock, b2);

      let bAlt = new Block(addr, genesis, EASY_POW_TARGET);
      bAlt.addTransaction(t2);
      // Finding a proof.
      miner.currentBlock = bAlt;
      bAlt.proof = 0;
      miner.findProof(true);
      // Receiving and verifying block
      clint.receiveBlock(bAlt);
      assert.equal(clint.blocks.get(bAlt.id), bAlt);
      assert.equal(clint.lastBlock, b2);
    });
  });
});
