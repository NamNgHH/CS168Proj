"use strict";

const Blockchain = require("./blockchain.js");
const Block = require("./block.js");
const Transaction = require("./transaction.js");
const FakeNet = require("./fake-net.js");

console.log("Mining-style duplicate-root scenario demo");

// 1) Build a tiny chain with a miner and users.
const bc = Blockchain.createInstance({
  clients: [
    { name: "Alice", amount: 200 },
    { name: "Bob", amount: 200 },
    { name: "Charlie", amount: 200 },
    { name: "Minnie", amount: 300, mining: true },
  ],
  mnemonic:
    "antenna dwarf settle sleep must wool ocean once banana tiger distance gate great similar chief cheap dinner dolphin picture swing twenty two file nuclear",
  net: new FakeNet(),
});

const [alice, bob, charlie, minnie] = bc.getClients("Alice", "Bob", "Charlie", "Minnie");
const prev = bc.genesis;

// 2) Honest block candidate with 3 txs (odd leaf count).
const honest = new Block(minnie.address, prev, Blockchain.POW_TARGET);
const tx1 = alice.postTransaction([{ amount: 10, address: bob.address }], 1);
const tx2 = bob.postTransaction([{ amount: 10, address: charlie.address }], 2);
const tx3 = charlie.postTransaction([{ amount: 10, address: alice.address }], 3);
honest.addTransaction(tx1);
honest.addTransaction(tx2);
honest.addTransaction(tx3);
const honestRoot = honest.getMerkleRoot();

console.log("\nHonest block");
console.log(`tx count: ${honest.transactions.length}`);
console.log(`merkle root: ${honestRoot}`);

// 3) Tamper serialized wire payload by appending duplicate tail tx.
// This models a relay/attacker mutating the tx list on the wire.
const o = JSON.parse(honest.serialize());
o.transactions = [...o.transactions, o.transactions[o.transactions.length - 1]];
const tampered = Blockchain.deserializeBlock(o);
const tamperedRoot = tampered.getMerkleRoot();

console.log("\nTampered wire block (duplicate tail tx appended)");
console.log(`tx count on wire: ${o.transactions.length}`);
console.log(`merkle root after deserialize: ${tamperedRoot}`);
console.log(`same root as honest: ${honestRoot === tamperedRoot}`);
console.log(`invalidDuplicateWireTxIds: ${tampered.invalidDuplicateWireTxIds}`);

// 4) Node-side validation should reject the tampered block.
const accepted = tampered.rerun(prev);
console.log(`rerun accepted: ${accepted}`);
console.log("expected: false (duplicate wire ids should invalidate)");

