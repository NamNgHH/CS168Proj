"use strict";

let Blockchain = require('./blockchain.js');

// Used to create a miner outside of the blockchain constructor.
let Miner = require('./miner.js');

let FakeNet = require('./fake-net.js');

console.log("Starting simulation.  This may take a moment...");

// Creating genesis block
let bc = Blockchain.createInstance({
  clients: [
    {name: 'Alice', amount: 800},
    {name: 'Bob', amount: 0},
    {name: 'Minnie', amount: 400, mining: true},
    {name: 'Mickey', amount: 300, mining: true},
  ],
  mnemonic: "antenna dwarf settle sleep must wool ocean once banana tiger distance gate great similar chief cheap dinner dolphin picture swing twenty two file nuclear",
  net: new FakeNet(),
});

// Get Alice and Bob
let [alice, bob] = bc.getClients('Alice', 'Bob');

// Showing the initial balances from Alice's perspective, for no particular reason.
console.log("Initial balances:");
alice.showAllBalances();

// The miners will start mining blocks when start is called.  After 8 seconds,
// the code will terminate and show the final balances from Alice's perspective.
bc.start(8000, () => {
  console.log("Final balances, from Alice's perspective:");
  alice.showAllBalances();
});

console.log(`Alice is transferring 10 gold to ${bob.address}`);
alice.postTransaction([{ amount: 10, address: bob.address }], 1);

console.log(`Alice is transferring 10 gold to ${bob.address}`);
alice.postTransaction([{ amount: 10, address: bob.address }], 2);

console.log(`Alice is transferring 10 gold to ${bob.address}`);
alice.postTransaction([{ amount: 10, address: bob.address }], 3);

console.log(`Alice is transferring 10 gold to ${bob.address}`);
alice.postTransaction([{ amount: 10, address: bob.address }], 4);

console.log(`Alice is transferring 10 gold to ${bob.address}`);
alice.postTransaction([{ amount: 10, address: bob.address }], 5);

console.log(`Alice is transferring 10 gold to ${bob.address}`);
alice.postTransaction([{ amount: 10, address: bob.address }], 6);

console.log(`Alice is transferring 10 gold to ${bob.address}`);
alice.postTransaction([{ amount: 10, address: bob.address }], 7);

console.log(`Alice is transferring 10 gold to ${bob.address}`);
alice.postTransaction([{ amount: 10, address: bob.address }], 8);
