/*
  This VC example uses previously computed canonicalized non-mandatory statements
  along with a precomputed list of salts stored in JSON files.
*/

import { mkdir, readFile } from "fs/promises";
import { MerkleTree, leafHash, verifyInclusion, instrument } from "./merkleMultiProof.js";
import { bytesToHex, concatBytes, hexToBytes } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";  //  for quick check
const LEAF_PREFIX = 0x00;

//  Recover just the nonMandatory statements in order
const transformSD = JSON.parse(
  await readFile(new URL("./addBaseTransform.json", import.meta.url)),
);
const nonMandatory = transformSD.nonMandatory.value.map(x=>x[1]);
// console.log(nonMandatory)
//  Recover salts and salted hashes
const hashSD = JSON.parse(
  await readFile(new URL("./addSaltedHashes.json", import.meta.url)),
);
// console.log(hashSD); // salts and saltedHases are in hex

// Create my entries from salts and nonMandatory.
const encoder = new TextEncoder(); // Use encoder to convert to Uint8Array
const entries = [];
const salts  = hashSD.salts;
// console.log(`length salts: ${salts.length}, length non-mandatory: ${nonMandatory.length}`);
for (let i = 0; i < salts.length; i++) {
  entries.push(concatBytes(hexToBytes(salts[i]), encoder.encode(nonMandatory[i])));
}
// To check against salted hashes in JSON file.
// Leaf entries are different since they get a leaf prefix.
let saltedHashCheck = entries.map(x => sha256(x));
// console.log(saltedHashCheck.map(x => bytesToHex(x)));

instrument.subtreeHash = true;
const tree = new MerkleTree(entries.slice(0,10)); // Can try a smaller tree with a slice of entries.
instrument.subtreeHash = false;

// console.log("Tree leaves:");
// console.log(tree.leafHashes.map(x => bytesToHex(x)));
console.log("MTH:");
console.log(bytesToHex(tree.root));

// From the VC test vector these are the indexes we need inclusion proofs for.
// const selectiveIndexes = [0,1,8,13,14,15]; // From the test vector
// const selectiveIndexes = [0,1, 2, 3,4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // To see how big.
const selectiveIndexes = [2, 5]; // To try tracing a path
let proofs = [];
let proofsHex = [];
for (let index of selectiveIndexes) {
  console.log(`Inclusion proof for Leaf ${index}`);
  console.log(`Leaf${index}[fillcolor="red", style=filled]`)
  let { leafIndex, treeSize, inclusionPath } = tree.inclusionProof(index);
  proofs.push(inclusionPath);
  console.log(inclusionPath);
  proofsHex.push(inclusionPath.map(x => bytesToHex(x)));
  // console.log(`index:  ${index}, leafIndex: ${leafIndex}, treeSize: ${treeSize}`);
}
// console.log(proofsHex);

// Now verify the selected entries
// async function verifyInclusion(leaf, leafIndex, treeSize, inclusionPath, rootHash)
let  treeSize = nonMandatory.length;
let  rootHash = tree.root;
let  proofTotal = 0; // let's see how many hashes in proof
for (let i = 0; i < selectiveIndexes.length; i++) {
  let index = selectiveIndexes[i];
  let leaf = leafHash(concatBytes(hexToBytes(salts[index]), encoder.encode(nonMandatory[index])));
  let okay = verifyInclusion(leaf, index, treeSize, proofs[i], rootHash)
  proofTotal  += proofs[i].length;
  console.log(`index:  ${index}, verified: ${okay}`);
}
console.log(`Total proof entries: ${proofTotal}`);

console.log(tree);
