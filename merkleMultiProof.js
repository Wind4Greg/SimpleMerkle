// merkleMultiProof — Merkle tree creation per RFC 9162, Section 2.1
// Added in full tree creation since its used in multi-proofs.
// Added functions to check multi-proofs.
// 

import { bytesToHex, concatBytes } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";

const LEAF_PREFIX = 0x00;
const NODE_PREFIX = 0x01;

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Largest power of two strictly smaller than n (n > 1), i.e. k < n <= 2k.
function splitPoint(n) {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}

// MTH({d}) = HASH(0x00 || d)
export function leafHash(data) {
  return sha256(concatBytes(Uint8Array.of(LEAF_PREFIX), data));
}

// HASH(0x01 || left || right)
export function nodeHash(left, right) {
  return sha256(concatBytes(Uint8Array.of(NODE_PREFIX), left, right));
}

class TreeNode {
  constructor(value, left, right) {
    this.value = value;
    this.left = left;
    this.right = right;
  }
  
}

// Recursively creates the Merkle tree and computes node hashes
// as it goes.
function subtreeHash(leafHashes, start, end, fullTree) {
  const n = end - start;
  if (n === 0) return sha256(new Uint8Array(0)); // MTH({}) = HASH()
  if (n === 1) return leafHashes[start];
  const k = splitPoint(n);
  const value = nodeHash(
    subtreeHash(leafHashes, start, start + k, fullTree),
    subtreeHash(leafHashes, start + k, end, fullTree)
  );
  // Full tree creation
  let  nodeName;
  let lChild = null;
  let rChild = null;
  nodeName = `N_${start}_${end}`;
  if (k > 1) {
    lChild = `N_${start}_${start+k}`;
  } else {
    lChild = `Leaf${start}`;
  }
  if ((end - (start + k)) > 1) {
    rChild = `N_${start+k}_${end}`;
  } else {
    rChild = `Leaf${start+k}`
  }
  let isRoot = (start ==  0) && (end  == leafHashes.length);
  if (isRoot) {
    fullTree.rootName = nodeName;
  }
  let treeNode = new TreeNode(value, lChild, rChild);
  if (fullTree) {
    fullTree[nodeName] = treeNode;
  };
  return value;
}

// Recursively creates the structure for Merkle tree for a list of a
// given length. Used in verifying subtree proofs.
function subtreeEmpty(treeSize, start, end, fullTree) {
  const n = end - start;
  if (n === 0) return;
  if (n === 1) return;
  const k = splitPoint(n);
  // Recursion step
  const value = [subtreeEmpty(treeSize, start, start + k, fullTree),
    subtreeEmpty(treeSize, start + k, end, fullTree)];
  
  let  nodeName;
  let lChild = null;
  let rChild = null;
  nodeName = `N_${start}_${end}`;
  if (k > 1) {
    lChild = `N_${start}_${start+k}`;
  } else {
    lChild = `Leaf${start}`;
  }
  if ((end - (start + k)) > 1) {
    rChild = `N_${start+k}_${end}`;
  } else {
    rChild = `Leaf${start+k}`
  }
  let isRoot = (start ==  0) && (end  == treeSize);
  if (isRoot) {
    fullTree.rootName = nodeName;
  }
  let treeNode = new TreeNode(null, lChild, rChild);
  if (fullTree) {
    fullTree[nodeName] = treeNode;
  };
  return;
}

export class MerkleTree {
  /** @param {Uint8Array[]} entries */
  constructor(entries) {
    if (entries) {
    this.fullTree = {}; // To store full tree
    this.leafHashes = entries.map(leafHash);
    this.mth = subtreeHash(this.leafHashes, 0, this.leafHashes.length, this.fullTree);
    }
  }

  static createEmpty(treeSize) {
    let tree  = new MerkleTree();
    let fullTree  = {};
    subtreeEmpty(treeSize, 0, treeSize, fullTree);
    tree.fullTree = fullTree;
    return tree;
  }

  get size() {
    return this.leafHashes.length;
  }

  inclusionMultiProof(selectedIndexes) {
    return multiProof(this.fullTree.rootName, selectedIndexes, this.fullTree);
  }

  inclusionMultiProofValues(selectedIndexes)  {
    let nodeList = multiProof(this.fullTree.rootName, selectedIndexes, this.fullTree);
    let valueList = [];
    nodeList.forEach(nodeName => {
      if  (nodeName.includes('Leaf')) {
        let leafNum = parseInt(nodeName.slice(4));
        valueList.push(this.leafHashes[leafNum]);
      } else {
        valueList.push(this.fullTree[nodeName].value);
      }
    })
    return valueList;
  }
}

// Gives an ordered list of leaves under a given node Name.
function preOrderLeaves(nodeName, tree) {
  // console.log(nodeName);
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

// Recursive function used to create the multi-proof (subtree proof)
function multiProof(nodeName, selected, tree) {
  // console.log(`node name:  ${nodeName}`);
  if (allLeavesSelected(nodeName, selected, tree)) {
    return [];
  } else if (noLeavesSelected(nodeName, selected, tree)) {
    return [nodeName];
  } else  {
    return [...multiProof(tree[nodeName].left, selected, tree), ...multiProof(tree[nodeName].right, selected,  tree)];
  }
}

export function verifyMultiProof(treeSize, selectedIndexes, selectedLeaves, multiProof) {
  // Create empty tree of treeSize and then populate it with values.
  let partialTree = MerkleTree.createEmpty(treeSize);
  // Create symbolic multi-proof
  let symbolicMP = partialTree.inclusionMultiProof(selectedIndexes);
  // Add selected leaf hashes
  let leafHashes = new Array(treeSize);
  let i = 0;
  for (let index of selectedIndexes) {
    leafHashes[index] = leafHash(selectedLeaves[i]);
    i++;
  }
  // Re-populate the rest from the multiProof
  let j = 0;
  for (let nodeName of symbolicMP) {
    if (nodeName.includes('Leaf'))  { // add leaf hash
      let leafNum = parseInt(nodeName.slice(4));
      leafHashes[leafNum] = multiProof[j];
      j++;
    } else {  // add node has
      partialTree.fullTree[nodeName].value = multiProof[j];
      j++;
    }
  }
  partialTree.leafHashes  = leafHashes;
  // console.log("Partial tree:");
  // console.log(partialTree);
  let rootHash  = treeHash(partialTree.fullTree.rootName, partialTree);
  return rootHash;
}

// Recursive function used to compute the hash of a populated tree.
function treeHash(nodeName, tree) {
  if (nodeName.includes('Leaf')) {
    let leafNum = parseInt(nodeName.slice(4));
    // console.log(`Leaf terminal:  ${nodeName}`);
    // console.log(tree.leafHashes[leafNum]);
    return tree.leafHashes[leafNum];
  } else {
    if (tree.fullTree[nodeName].value != null) {
      // console.log(`Node terminal: ${nodeName}`);
      // console.log(tree.fullTree[nodeName].value);
      return tree.fullTree[nodeName].value;
    } else  {
      let left = tree.fullTree[nodeName].left;
      let right = tree.fullTree[nodeName].right;
      // console.log(`recursion left: ${left}, right: ${right}`);
      return nodeHash(treeHash(left, tree), treeHash(right, tree));
    }
  }
}
