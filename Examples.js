/*
  This example generates a leaf list of defined size with dummy data.
  Generation of subtree proof (multi-proofs) given selected indexes.
  Allows for generation of GraphViz visualization of tree and proof.
  Positive Verification of proof.
  Negative verification of either modified leaves or modified proof.

*/

import { writeFile } from "fs/promises";
import { MerkleTree, verifyMultiProof } from "./merkleMultiProof.js";
import { bytesToHex, concatBytes, hexToBytes } from "@noble/hashes/utils.js";

const encoder = new TextEncoder(); // Use encoder to convert to Uint8Array
const listSize = 15;
const entries = [];
for (let i = 0; i < listSize; i++) {
  // Dummy data of the form L0, L1,...
  entries.push(encoder.encode(`L${i}`)); // need it as bytes
}
const tree = new MerkleTree(entries); // Can try a smaller tree with a slice of entries.
console.log(tree.fullTree);

const selected = [1, 6]; // Your choice must be in-order and range
const inclusionProof = tree.inclusionMultiProof(selected);
const inclusionProofValues = tree.inclusionMultiProofValues(selected);
console.log("Multi-proof values:");
console.log(inclusionProofValues.map((x) => bytesToHex(x)));
console.log("Multiproof node names:");
console.log(inclusionProof);

let treeSize = tree.size;
let selectedLeaves = entries.filter((value, index) => selected.includes(index));
let calcRoot = verifyMultiProof(
  treeSize,
  selected,
  selectedLeaves,
  inclusionProofValues,
);
console.log(`rootHash: ${bytesToHex(tree.mth)}`);
console.log(`recomputed roothash:  ${bytesToHex(calcRoot)}`);
console.log(`Good stuff verified:  ${isEqualArray(tree.mth, calcRoot)}`);

// Negative tests
let badStuff = encoder.encode('not a  real leaf value');
let badSelectedLeaves = selectedLeaves.slice();
badSelectedLeaves[0] = badStuff; // Replace real value with bad stuff
calcRoot = verifyMultiProof(treeSize, selected, badSelectedLeaves, inclusionProofValues);
console.log(`Bad stuff verified: ${isEqualArray(calcRoot, tree.mth)}`);

let fname = `./output/merkle${tree.size}mp${selected.join('_')}.dot`;

let graphVizString = createGraphViz(tree.fullTree, selected, inclusionProof);
await writeFile(fname, graphVizString);

// Helper functions

function highlightGraphVis(selected, proof) {
  let outputString = "";
  for (let i of selected) {
    outputString += `Leaf${i}[fillcolor="red", style=filled]\n`;
  }
  for (let nodeName of proof) {
    outputString += `${nodeName}[fillcolor="blue", style=filled]\n`;
  }
  return outputString;
}

function createGraphViz(tree, selected, proof) {
  let outputString = "digraph G {\n";

  for (let nodeName in tree) {
    if (nodeName != "rootName") {
      outputString += `${nodeName} -> ${tree[nodeName].left}\n`;
      outputString += `${nodeName} -> ${tree[nodeName].right}\n`;
    }
  }
  if (selected) {
    outputString += `${highlightGraphVis(selected, proof)}\n`;
  }
  outputString += "}\n";
  return outputString;
}

function isEqualArray(a, b) {
  if (a.length != b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
  return true;
}
