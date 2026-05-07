"use strict";

let Blockchain = require('./blockchain.js');
let Block = require('./block.js');
let FakeNet = require('./fake-net.js');

console.log("Starting header + fee-priority + merkle demo...");

// Single miner keeps the ordering deterministic for demo output.
let bc = Blockchain.createInstance({
  clients: [
    {name: 'Alice', amount: 200},
    {name: 'Charlie', amount: 200},
    {name: 'Dave', amount: 200},
    {name: 'Eve', amount: 200},
    {name: 'Bob', amount: 100},
    {name: 'Minnie', amount: 300, mining: true},
  ],
  mnemonic: "antenna dwarf settle sleep must wool ocean once banana tiger distance gate great similar chief cheap dinner dolphin picture swing twenty two file nuclear",
  net: new FakeNet(),
});

let [alice, charlie, dave, eve, bob] = bc.getClients('Alice', 'Charlie', 'Dave', 'Eve', 'Bob');

console.log("Initial balances:");
alice.showAllBalances();

// Start mining first so miner listener is subscribed to POST_TRANSACTION.
bc.start(5000, () => {
  console.log("\nFinal balances (Alice view):");
  alice.showAllBalances();

  let head = alice.lastBlock;
  while (head && head.isGenesisBlock()) head = alice.blocks.get(head.prevBlockHash);
  if (!head) {
    console.log("No non-genesis block mined in time.");
    return;
  }

  console.log("\n--- Latest mined block header ---");
  console.log(head.getHeader());

  let txs = [...head.transactions.values()];
  console.log("\nTransactions in latest block (fee descending expected):");
  txs.forEach((tx, i) => console.log(`  #${i+1} tx=${tx.id.slice(0, 16)}... fee=${tx.fee}`));

  if (txs.length > 0) {
    let sampleTx = txs[0];
    let proof = head.getMerkleProof(sampleTx);
    let ok = Block.verifyMerkleProof(proof);
    console.log(`\nMerkle proof verify for tx ${sampleTx.id.slice(0, 16)}...: ${ok}`);
    console.log(`Block merkle root: ${head.getMerkleRoot()}`);
  }
});

// Use different senders (nonce gate in miner mempool only accepts the current expected nonce per sender).
setTimeout(() => {
  console.log("\nPosting transactions with different fees...");
  alice.postTransaction([{ amount: 10, address: bob.address }], 1);
  charlie.postTransaction([{ amount: 10, address: bob.address }], 9);
  dave.postTransaction([{ amount: 10, address: bob.address }], 4);
  eve.postTransaction([{ amount: 10, address: bob.address }], 7);
}, 100);

