"use strict";

const utils = require('./utils.js');

// Stores transactions in a MerkleTree format.
// The tree will be perfectly balanced.
class MerkleTree {

  // Returns the size
  static calculateSize(numElems) {
    // Calculate a power of 2 at least as large as numElems.
    let n = 1;
    while (n < numElems) {
      n *= 2;
    }
    // We need almost double the space to hold the parent hashes.
    // E.g. if we have 8 transactions, we need to store their 8
    // hashes plus the 7 parent hashes.
    return (n * 2) - 1;
  }

  // Hashes from a node to the Merkle root, or until it does not have
  // the other half of the hash needed to continue to the root.
  static hashToRoot(hashes, i) {
    if (i === 0) return;
    let par = (i-2)/2;
    hashes[par] = utils.hash("" + hashes[i-1] + "," + hashes[i]);

    // Test to see if we are the right subnode.  If so, we can hash
    // with the left subnode to continue one level up.
    if (par%2 === 0) {
      this.hashToRoot(hashes, par);
    }
  }

  constructor(transactions) {
    // Actual transactions
    this.transactions = [];

    // Transaction hashes
    this.hashes = [];

    // hash-to-index Lookup table
    this.lookup = {};

    //return empty root if no transactions
    if (transactions.length === 0) {
      this.hashes[0] = utils.hash("");
      return;
    }
    
    // We want to maintain a balanced tree, so we may need to pad
    // out the last few elements.
    let numBalancedTree = this.constructor.calculateSize(transactions.length);

    // Hashes of transactions start in the middle of the array.
    let firstTrans = Math.floor(numBalancedTree / 2);

    for (let i=firstTrans; i<numBalancedTree; i++) {
      let tNum = i - firstTrans;

      // If we have less than a power of 2 elements,
      // we pad out the transactions and arrays with the last element
      let v = tNum<transactions.length ? transactions[tNum].toString() : this.transactions[tNum-1];
      let h = utils.hash(v);

      this.transactions[tNum] = v;
      this.hashes[i] = h;
      this.lookup[h] = i;
    }

    // Completing inner nodes of Merkle tree
    for (let i=firstTrans+1; i<this.hashes.length; i+=2) {
      this.constructor.hashToRoot(this.hashes, i);
    }
  }

  // Returns the Merkle root
  get root() {
    return this.hashes[0];
  }

  getPath(transaction) {
    let h = utils.hash(transaction);
    let i = this.lookup[h];
    let path = {
        txInd: i,
        siblings: []
    };

    while (i > 0) {
        let siblingIndex = (i % 2 === 1) ? i + 1 : i - 1;

        path.siblings.push({
            index: siblingIndex,
            hash: this.hashes[siblingIndex]
        });

        i = Math.floor((i - 1) / 2);
    }
    return path;
  }

  // Return true if the tx matches the path.
    verify(tx, path) {
        if (!path || !path.siblings) return false;

        let h = utils.hash(tx);
        let i = path.txInd;

        for (const sibling of path.siblings) {
            if (i % 2 === 1) {
            h = utils.hash(h + "," + sibling.hash);
            } else {
            h = utils.hash(sibling.hash + "," + h);
            }
            i = Math.floor((i - 1) / 2);
        }

        return h === this.root;
    }

    display() {
      let i = 0;
      let nextRow = 0;
      let s = "";

      console.log();

      while (i < this.hashes.length) {
        s += this.hashes[i].slice(0,6) + " ";

        if (i === nextRow) {
          console.log(s);
          s = "";
          nextRow = (nextRow+1) * 2;
        }

        i++;
      }
    }
}


exports.MerkleTree = MerkleTree;
