"use strict";
const Blockchain = require("./blockchain.js");
const FakeNet = require("./fake-net.js");
console.log("Starting priority-fee demo...");
// Transaction senders are also miners (miners participate in fee bidding too).
const bc = Blockchain.createInstance({
  clients: [
    { name: "Alice", amount: 200, mining: true },
    { name: "Charlie", amount: 200, mining: true },
    { name: "Dave", amount: 200, mining: true },
    { name: "Eve", amount: 200, mining: true },
    { name: "Frank", amount: 200, mining: true },
    { name: "Grace", amount: 200, mining: true },
    { name: "Heidi", amount: 200, mining: true },
    { name: "Ivan", amount: 200, mining: true },
    { name: "Judy", amount: 200, mining: true },
    { name: "Bob", amount: 100 },
    { name: "Minnie", amount: 300, mining: true },
    { name: "Mickey", amount: 300, mining: true },
    { name: "Donald", amount: 300, mining: true },
  ],
  mnemonic:
    "antenna dwarf settle sleep must wool ocean once banana tiger distance gate great similar chief cheap dinner dolphin picture swing twenty two file nuclear",
  net: new FakeNet(),
});
const [alice, charlie, dave, eve, frank, grace, heidi, ivan, judy, bob] = bc.getClients(
  "Alice", "Charlie", "Dave", "Eve", "Frank", "Grace", "Heidi", "Ivan", "Judy", "Bob"
);
const senders = [alice, charlie, dave, eve, frank, grace, heidi, ivan, judy];
const fees = [1, 9, 4, 7, 3, 8, 2, 6, 5]; // 9 txs, block cap is 8
// expected included fees in first tx-bearing block: [9,8,7,6,5,4,3,2]
console.log("\nPosting 9 transactions with fees:", fees.join(", "));
// Start mining first so miner subscribes to POST_TRANSACTION.
bc.start(12000, () => {
  // Read from an actual miner's perspective.
  let [minnie] = bc.getClients("Minnie");

  console.log("\nMining window complete.");
  console.log("\nFinal confirmed balances (gold):");
  minnie.showAllBalances();

  console.log("\nLatest-tip balances (may include unconfirmed blocks):");
  for (let [id, balance] of minnie.lastBlock.balances.entries()) {
    let client = bc.clientAddressMap.get(id);
    let name = client && client.name ? client.name : id;
    console.log(`    ${id} (${name}): ${balance}`);
  }

  // Find the block with the highest tx count in the current best chain.
  let b = minnie.lastBlock;
  let best = null;
  while (b && !b.isGenesisBlock()) {
    if (b.transactions.length > 0 && (!best || b.transactions.length > best.transactions.length)) {
      best = b;
    }
    b = minnie.blocks.get(b.prevBlockHash);
  }
  if (!best) {
    console.log("No transaction-bearing block found.");
    return;
  }
  b = best;
  console.log(`\nSelected block height: ${b.chainLength}`);
  console.log(`Transaction count in selected block: ${b.transactions.length}`);
  console.log(`Merkle root: ${b.getMerkleRoot()}`);
  const txFees = b.transactions.map((tx) => tx.fee);
  console.log("Fees included in this block:", txFees.join(", "));
  const sorted = [...txFees].sort((a, c) => c - a);
  const isDesc = txFees.every((fee, i) => fee === sorted[i]);
  console.log("Is fee-descending order?", isDesc);
  console.log("\nExpected top 8 fees from posted set:", [9,8,7,6,5,4,3,2].join(", "));
});
setTimeout(() => {
  senders.forEach((sender, i) => {
    sender.postTransaction([{ amount: 10, address: bob.address }], fees[i]);
  });
}, 100);