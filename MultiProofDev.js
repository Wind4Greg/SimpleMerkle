/*
  This VC example uses previously computed canonicalized non-mandatory statements
  along with a precomputed list of salts stored in JSON files.
*/

import { readFile } from "fs/promises";
import { MerkleTree, verifyMultiProof } from "./merkleMultiProof.js";
import { bytesToHex, concatBytes, hexToBytes } from "@noble/hashes/utils.js";

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

const tree = new MerkleTree(entries.slice(0,20)); // Can try a smaller tree with a slice of entries.
console.log(tree);

// Trying basic pre-order tree traversal first. 
// This gives the leaves in list order.
function preOrder(nodeName, tree) {
  // console.log(nodeName);
  if(nodeName.includes('Leaf'))  {
    return; // Leaf node
  } else  {
    preOrder(tree[nodeName].left, tree);
    preOrder(tree[nodeName].right, tree);
  }
}


function highlightGraphVis(selected, proof)  {
  for (let i of selected)  {
    console.log(`Leaf${i}[fillcolor="red", style=filled]`);
  }
  for (let nodeName of proof) {
    console.log(`${nodeName}[fillcolor="blue", style=filled]`)
  }

}

const selected = [7, 15]; // [0, 1, 7, 13, 14]
const inclusionProof = tree.inclusionMultiProof(selected)
const inclusionProofValues  = tree.inclusionMultiProofValues(selected);
console.log("Multi-proof values:");
console.log(inclusionProofValues.map(x => bytesToHex(x)));
console.log("Multiproof node names:");
console.log(inclusionProof);
// highlightGraphVis(selected, inclusionProof);

let treeSize = tree.size;
let selectedLeaves = entries.filter((value, index) => selected.includes(index));
// console.log(entries);
// console.log(selectedLeaves);
let calcRoot = verifyMultiProof(treeSize, selected, selectedLeaves, inclusionProofValues);
console.log(`rootHash: ${bytesToHex(tree.mth)}`);
console.log(`recomputed roothash:  ${bytesToHex(calcRoot)}`);
