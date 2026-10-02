/*
  This VC example uses previously computed canonicalized non-mandatory statements
  along with a precomputed list of salts stored in JSON files.
*/

import { readFile } from "fs/promises";
import { MerkleTree, leafHash, verifyInclusion, instrument } from "./merkleInstr.js";
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

instrument.subtreeHash = false;
const tree = await MerkleTree.create(entries.slice(0,20)); // Can try a smaller tree with a slice of entries.
instrument.subtreeHash = false;
console.log(tree);

// Trying basic pre-order tree traversal first. 
// This gives the leaves in list order.
function preOrder(nodeName, tree) {
  console.log(nodeName);
  if(nodeName.includes('Leaf'))  {
    return; // Leaf node
  } else  {
    preOrder(tree[nodeName].left, tree);
    preOrder(tree[nodeName].right, tree);
  }
}

// Gives an ordered list of leaves under a given node Name.
function preOrderLeaves(nodeName, tree) {
  console.log(nodeName);
  if(nodeName.includes('Leaf'))  {
    return  [nodeName];
  } else {
  return [...preOrderLeaves(tree[nodeName].left, tree), ...preOrderLeaves(tree[nodeName].right, tree)];
  }
}

function allLeavesSelected(nodeName, selected, tree)  {
  const leaves = preOrderLeaves(nodeName, tree);
  let allSelected  = true;
  for (let leafName of leaves) {
    let leafNum =  parseInt(leafName.slice(4)); //  Gets the leaf index from the string, e.g., "Leaf11" -> 11
    allSelected &&= selected.includes(leafNum);
  }
  return allSelected;
}

function noLeavesSelected(nodeName, selected, tree)  {
  const leaves = preOrderLeaves(nodeName, tree);
  let someSelected  = false;
  for (let leafName of leaves) {
    let leafNum =  parseInt(leafName.slice(4)); //  Gets the leaf index from the string, e.g., "Leaf11" -> 11
    someSelected ||= selected.includes(leafNum);
  }
  return !someSelected;
}


function multiProof(nodeName, selected, tree) {
  if (allLeavesSelected(nodeName, selected, tree)) {
    return [];
  } else if (noLeavesSelected(nodeName, selected, tree)) {
    return [nodeName];
  } else  {
    return [...multiProof(tree[nodeName].left, selected, tree), ...multiProof(tree[nodeName].right, selected,  tree)];
  }
}

// preOrder(tree.fullTree.rootName, tree.fullTree);
// preOrder('N_8_10', tree.fullTree)
// console.log("Leaves:");
// console.log(preOrderLeaves('N_4_8', tree.fullTree));

function highlightGraphVis(selected, proof)  {
  for (let i of selected)  {
    console.log(`Leaf${i}[fillcolor="red", style=filled]`);
  }
  for (let nodeName of proof) {
    console.log(`${nodeName}[fillcolor="blue", style=filled]`)
  }

}

const selected = [0, 1, 7];
console.log(noLeavesSelected('N_4_8', [1, 4], tree.fullTree));
const inclusionProof = multiProof(tree.fullTree.rootName, selected, tree.fullTree)
console.log(inclusionProof);
highlightGraphVis(selected, inclusionProof);
