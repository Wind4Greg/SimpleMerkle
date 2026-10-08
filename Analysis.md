# Algorithm Analysis

To see if we can come up with more a compact representation and interpretation of a batch of inclusion proofs need to understand the algorithm and see the tree.

Items to note:

1. The tree structure is completely determined by the list size and not the values of the leaves or intermediate node hashes.
2. During tree creation the root value is computed recursively from the top down using the `subtreeHash()` function.
3. Inclusion proofs are computed recursively from the bottom (leaf) up using the `path()` function. The return value is a list of hashes.
4. Verification of proofs are **not** done recursively. It is done by starting with the given leaf hash then combining with the hashes in the inclusion proof. The tree size and the leaf index control the order (left, right) of how the node hashes are computed up the tree towards the root.
5. There is no need to verify leaves individually. For example full disclosure of all the leaves allows a check without sending any extra proof information, just recompute the hash corresponding to the tree root node.

## Batch Inclusion Proof and Verification

By "batch" inclusion proof I mean I'd like some kind of "proof" that covers multiple leaves at the same time. The essence is that we need sufficient information to recompute the root hash from the given leaf hashes but no more. Intuitively, all leaf hashes to be validated must be "rolled into" the root hash and not overshadowed by an upper level given node hash. Below is an example of the additional nodes shown in blue to verify the given leaf hashes shown in red.

![Batch Proof L6 and L19](./batch6_19.svg)

The two separate inclusion proofs for leaves 6 and 19 would have had lengths 5 and 4 respectively. While from the diagram we can see a total of 6 additional nodes of information rather than 9.

Another thing we can see that each "blue node" (proof node) is either a necessary leaf (a partner to the one being proven) or is a "stand-in" for a range of non-revealed leaves.

Hmm, all this structure is determined by the tree size and the indexes of the leaves to be proven.

Another example of "batch proof" for leaves 8 and 9. In this case instead of two proofs of length 5 we have a single "batch proof" of length 4.

![Batch Proof L8 and L9](./batch8_9.svg)

## Example Tree of 20 Leaves

This is extracted from an VC example that has 20 non-mandatory statements.

* *n* is the length of the list to be turned into a tree
* For n > 1, let k be the largest power of two smaller than n (i.e., k < n <= 2k).
* `MTH(D_n) = HASH(0x01 || MTH(D[0:k]) || MTH(D[k:n]))`
* D[k1:k2] = D'_(k2-k1) denotes the list {d'[0] = d[k1], d'[1] = d[k1+1], ..., d'[k2-k1-1] = d[k2-1]} of length (k2 - k1)
  
Recursive thing:
1. n = 20, k = 16: MTH(D_n) = HASH(0x01 || MTH(D[0:16]) || MTH(D[16:20]))
2. n = 16, k = 8: MTH(D[0:16]) = HASH(0x01 || MTH(D[0:8]) || MTH(D[8:16]))
3. n = 20, k = 8: MTH(D[16:20]) = HASH(0x01 || MTH(D[8:20]) || MTH(D[])

Let try reconstructing the tree from the dump (use only minimal leading bytes of hash):

```
Root:
(0, 20):48ca
Level 1:
(0, 16):6171; (16, 20):148f
Level 2:
(0, 8): 7256; (8, 16):38ae; (16, 18):87e0; (18, 20):f908
Level 3 (note only 4 entries):
(0, 4):36f3; (4, 8):56c7; (8, 12):d4f4; (12, 16):33c0

```

Instrumented dump from recursive `subtreeHash()` function:

```text
(0, 2): ff93f710ce6e80bd503c117d00da9ba51a017558fcef897f2024e1a6232e3824 // level 4 and hash of leaves 0 & 1
(2, 4): 5451ee87ab7b15ea7651ae144e5a8cc10634c89d9a11201058d8d0ada11094d7 // level 4
(0, 4): 36f3d382e52dd85145945bdd2184a432c46c2d8341eb1560ff14dadbbb5124c6 // level 3
(4, 6): 25ef73f0ee00f5fd544d98d95a792e3854534a79b8db57c25763b332ba13de58 //  level 4
(6, 8): e07cf33015203694b44bc75f3e739a619a9b628379349aa0d90e8f887ac21faf //  level 4
(4, 8): 56c7c1a89a9fd9b35f649bddfbe2ceaec40257e8bd5bab7d9a2adcdeff45f5a1 // level 3
(0, 8): 72566fc8ce3f6c2108f3a8150a63cefe69c54e2ee052ff1786c918045f494115 // level 2
(8, 10): 17dfd8d4375f72cb7da401228a126c1c540d639942306c97dc26a28cca9096f1  // level 4
(10, 12): 3d69eb828b2d99364ba114a9cca65ca9473f4ab10c8059fc9ccded9447aaf7df  // level 4
(8, 12): d4f473d5c0572255cc992a709d42cd1861ffa65576347ca2cff56081f79d359c // level 3
(12, 14): ce9e72a50fb10e53de9c8033ee19d0820bf94c44506558f21beeec1a7eb40dcc // level 4
(14, 16): 35e566b9946de1785519684edee470becdb7e52c727991949a36f4b4b4c859db // level 4
(12, 16): 33c055dd0f2ca7a17368f8fa5ac0fc77f3821d30be137484d76df2f8b4bfc542 // level 3
(8, 16): 38ae25ee5967e3c066a36fc65d5ff9604bc2b69ddc36faf59f92449f3dfa87a7 // level 2
(0, 16): 61710673681b7304f578069bd59cf575e4bc885c4ec8cdf19f0a48b8fd630327 // level 1
(16, 18): 87e0e5b42d51dc7dfff3b29bc02010b52953715af9dbd220dad181d7741e26e4 // level 2 and hash of leaves 18 & 19
(18, 20): f9085c1d4d4e61248281494592552377d633a1d0f90b467ec07b8b2e3dd92aea // level 2 and hash of leaves 1
(16, 20): 148f1c54b071fd9fd6bb74148eccc097bb4aaca1ddeedd1ad8d5ddbce9cab6b3 // level 1
(0, 20): 48cadd72866b40b6353796152076163bce5432f3de16dad47bff80a03de18991 // root
```

In visual form with better instrumentation and help from GraphViz.

Merkle tree from algorithm for n = 20:

![Generated Merkle Tree for n = 20](./merkle20.svg)

Merkle tree from algorithm for n = 19:

![Generated Merkle Tree for n = 19](./merkle19.svg)

Inclusion Proof:

For leaf 6:
N_16_20
N_8_16
N_0_4
N_4_6
Leaf7

![Visualized inclusion proof](./inclusion6.svg)

## Algorithms for Multi-Proofs?

From Devin (@studyzy) on GitHub:

```
If the batch is aggregated into a single minimal proof instead (known in the literature as a Merkle multi-proof or batch proof), the redundancy goes away.

The aggregation rule is a small recursion over the set of disclosed leaf indices:

1. All leaves under this node are disclosed → emit nothing (the verifier rebuilds this node from the disclosed leaves).
2. No leaf under this node is disclosed → emit this node's hash (1 value).
3. Mixed → recurse into both children and union the results.

The derived proof carries the union of emitted hashes plus the disclosed statements; the verifier reconstructs the root with the same MTH procedure as RFC 9162, skipping subtrees it can rebuild.
```

Now for an actual algorithm to implement this.

The `tree` from the original code includes the root (hash value), an array of leaf hashes, but not the intermediate nodes and their hashes or the explicit tree structure. So I'm adding a `fullTree` structure that looks something like this (n = 10 case).

```javascript
fullTree: {
  N_0_2: TreeNode { value: [Uint8Array], left: 'Leaf0', right: 'Leaf1' },
  N_2_4: TreeNode { value: [Uint8Array], left: 'Leaf2', right: 'Leaf3' },
  N_0_4: TreeNode { value: [Uint8Array], left: 'N_0_2', right: 'N_2_4' },
  N_4_6: TreeNode { value: [Uint8Array], left: 'Leaf4', right: 'Leaf5' },
  N_6_8: TreeNode { value: [Uint8Array], left: 'Leaf6', right: 'Leaf7' },
  N_4_8: TreeNode { value: [Uint8Array], left: 'N_4_6', right: 'N_6_8' },
  N_0_8: TreeNode { value: [Uint8Array], left: 'N_0_4', right: 'N_4_8' },
  N_8_10: TreeNode { value: [Uint8Array], left: 'Leaf8', right: 'Leaf9' },
  rootName: 'N_0_10',
  N_0_10: TreeNode { value: [Uint8Array], left: 'N_0_8', right: 'N_8_10' }
}
  ```

For reminder of tree traversal see [Wikipedia: Tree Traversal](https://en.wikipedia.org/wiki/Tree_traversal). Pre-order traversal results in leaves (our list entries) in order. Did a simple recursive multi-proof algorithm based on the above.

Example results for [0, 1, 7] selected, produces a multi-proof array [ 'N_2_4', 'N_4_6', 'Leaf6', 'N_8_16', 'N_16_20' ].

![Multi-proof for (0, 1, 7)](./batch0_1_7.svg)

Now, how to put the proof array back together with the selected values to recompute the root hash and check it against the signed version?

We want to generalize `function verifyInclusion(leaf, leafIndex, treeSize, inclusionPath, rootHash)` to something like `function verifyMultiInclusion(leaves, leafIndexes, treeSize, inclusionMulti, rootHash)`

A straightforward approach would be:

1. Re-create the empty tree based on the `treeSize`.
2. Based on the `selectedIndexes` (the given leafIndexes) create the multi-proof array like above that contains "symbolic" names for the tree nodes.
3. Assign values to the tree nodes based on the values in the given multi-proof and the symbolic  multi-proof and the given indexes.
4. Compute the root has from the populated binary tree and check it.

# VC Selective Disclosure Algorithms/Approach

* Issuer
  1. Generates salts from secret key and DRBG, salts and hashes all non-mandatory statements (result is an ordered list)
  2. Computes Merkle tree but only needs the root value, which it then signs.
  3. Sends VC with base proof that includes mandatory pointers, hmac_key, and salt_key  (plus other SHoC stuff).
* Holder
  1. Regenerates entire Merkle tree from salts and non-mandatory statement list.
  2. Based on selected indexes and above Merkle tree, creates a "Merkle inclusion multi-proof"
  3. Sends the "multi-proof", filtered salts, and selectedIndexes (plus other SHoC approach stuff), as well as the total number of non-mandatory statements = treeSize (needed for verifier to reconstruct the tree).
* Verifier
  1. Using the sent (filtered) salts and recovered non-mandatory (selected) statements computes the salted hashes for these "selected" leaves of the Merkle tree.
  2. Using tree size, selectiveIndexes, selected leaf hashes, and  multi-proof verify against the signed Merkle root node.