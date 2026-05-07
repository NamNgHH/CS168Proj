"use strict";

/**
 * Merkle commitments for SpartanGold blocks (see CHANGELOG.md).
 * Internal pairing uses double-SHA256 on concatenated 32-byte child hashes (hex in/out).
 */

const crypto = require("crypto");

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest();
}

function dblSha256(buf) {
  return sha256(sha256(buf));
}

function hexToBuf(hex) {
  return Buffer.from(hex, "hex");
}

function bufToHex(buf) {
  return buf.toString("hex");
}

function hashPairHex(leftHex, rightHex) {
  const left = hexToBuf(leftHex);
  const right = hexToBuf(rightHex);
  return bufToHex(dblSha256(Buffer.concat([left, right])));
}

function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Build a Bitcoin-style merkle root (duplicate last when odd) with the
 * "mutation" detection rule (invalidate if the last pair on an odd level
 * is two identical hashes).
 *
 * Returns:
 * - root: hex string (double-sha256 internal node hashing)
 * - mutated: boolean
 * - leafHashes: hex array (double-sha256(txId) by convention below)
 *
 * Notes:
 * - This is NOT byte-order flipped like Bitcoin display conventions; it's raw hex.
 */
exports.buildRoot = function buildRoot(leafHashes) {
  if (!Array.isArray(leafHashes)) throw new Error("leafHashes must be an array");
  if (leafHashes.length === 0) {
    // Define empty-tree root deterministically.
    return { root: bufToHex(dblSha256(Buffer.alloc(0))), mutated: false, leafHashes: [] };
  }

  let mutated = false;
  let level = leafHashes.slice();

  while (level.length > 1) {
    const next = [];
    const isOdd = (level.length % 2) === 1;
    if (isOdd) {
      // Bitcoin Core-style mutation signal: odd count + duplicate tail before balancing dup.
      if (level.length >= 2 && level[level.length - 1] === level[level.length - 2]) {
        mutated = true;
      }
      level.push(level[level.length - 1]);
    }

    for (let i = 0; i < level.length; i += 2) {
      next.push(hashPairHex(level[i], level[i + 1]));
    }
    level = next;
  }

  return { root: level[0], mutated, leafHashes };
};

/**
 * Build a fixed-size merkle tree array (1-indexed) for O(log N) proof creation.
 * We expand to the next power of 2 and fill any missing leaves by duplicating
 * the last real leaf hash (Bitcoin-like behavior).
 *
 * Returns:
 * - tree: array where indices [1..2*m-1] are used (m = power-of-2 leaf base)
 * - base: m
 * - mutated: boolean (same rule as buildRoot)
 */
exports.buildFixedTree = function buildFixedTree(leafHashes) {
  const { root, mutated } = exports.buildRoot(leafHashes);
  if (leafHashes.length === 0) {
    return { tree: [null, root], base: 1, mutated: false, root };
  }

  const n = leafHashes.length;
  const base = nextPow2(n);
  const tree = new Array(base * 2).fill(null); // [0..2*base-1], ignore 0

  // Leaves.
  for (let i = 0; i < base; i++) {
    const h = (i < n) ? leafHashes[i] : leafHashes[n - 1];
    tree[base + i] = h;
  }

  // Parents.
  for (let i = base - 1; i >= 1; i--) {
    tree[i] = hashPairHex(tree[i * 2], tree[i * 2 + 1]);
  }

  // root from array must match iterative root for the chosen padding/dup behavior.
  // (They will match for this duplication strategy.)
  return { tree, base, mutated, root: tree[1] };
};

/**
 * Create a membership proof for a leaf index.
 *
 * Proof format:
 * - index: leaf index in original leaf list
 * - leafHash: leaf hash hex
 * - siblings: array of {hash, left} where:
 *    - hash: sibling hex
 *    - left: true if sibling is on the left of current hash at that level
 * - root: expected root hex
 */
exports.getProof = function getProof({ tree, base, index, leafCount }) {
  if (!Number.isInteger(index) || index < 0 || index >= leafCount) {
    throw new Error("Invalid leaf index for proof");
  }
  let i = base + index;
  const leafHash = tree[i];
  const siblings = [];
  while (i > 1) {
    const isRight = (i % 2) === 1;
    const sibIndex = isRight ? (i - 1) : (i + 1);
    siblings.push({ hash: tree[sibIndex], left: isRight });
    i = Math.floor(i / 2);
  }
  return { index, leafHash, siblings, root: tree[1] };
};

exports.verifyProof = function verifyProof({ proof }) {
  let h = proof.leafHash;
  for (const { hash: sib, left } of proof.siblings) {
    h = left ? hashPairHex(sib, h) : hashPairHex(h, sib);
  }
  return h === proof.root;
};

/**
 * Convenience: hash a transaction id into a leaf hash.
 * We use double-SHA256 over the tx id string bytes.
 */
exports.leafHashFromTxId = function leafHashFromTxId(txId) {
  return bufToHex(dblSha256(Buffer.from(String(txId), "utf8")));
};

