"use strict";

const merkle = require("./merkle.js");

console.log("Duplicate-root ambiguity demo");

const h1 = merkle.leafHashFromTxId("tx-A");
const h2 = merkle.leafHashFromTxId("tx-B");
const h3 = merkle.leafHashFromTxId("tx-C");

const three = merkle.buildRoot([h1, h2, h3]);
const fourWithDupTail = merkle.buildRoot([h1, h2, h3, h3]);
const mutatedCase = merkle.buildRoot([h1, h2, h2]);

console.log("\nCase 1: [h1, h2, h3]");
console.log(`root=${three.root}`);
console.log(`mutated=${three.mutated}`);

console.log("\nCase 2: [h1, h2, h3, h3] (explicit duplicate tail leaf)");
console.log(`root=${fourWithDupTail.root}`);
console.log(`mutated=${fourWithDupTail.mutated}`);

console.log("\nCase 3: [h1, h2, h2] (odd-level duplicate-tail mutation signal)");
console.log(`root=${mutatedCase.root}`);
console.log(`mutated=${mutatedCase.mutated}`);

console.log("\nSame root for case 1 and 2:", three.root === fourWithDupTail.root);
console.log("Mutation rule catches case 3:", mutatedCase.mutated === true);

