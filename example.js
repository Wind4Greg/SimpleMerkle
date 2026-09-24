import { MerkleTree, leafHash, verifyInclusion } from "./merkle.js";

const entries = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])]; 

const tree = await MerkleTree.create(entries); 

console.log("Tree:");
console.log(tree);
const { leafIndex, treeSize, inclusionPath } = await tree.inclusionProof(1); 
console.log(`leafIndex: ${leafIndex}, treeSize:  ${treeSize}, inclusionPath:`);
console.log(inclusionPath);

const ok = await verifyInclusion(await leafHash(entries[1]), leafIndex, treeSize, inclusionPath, tree.root);