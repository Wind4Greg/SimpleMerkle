# RFC9162 Minimal Merkle Tree Implementation

[RFC9162](https://www.rfc-editor.org/info/rfc9162/#section-2.1) Gives a basic algorithm to implement Merkle tree functionality. It includes:

1. Creation of a Merkle tree. This includes computation of all the leaf hashes and the "Merkle tree hash" MTH. It doesn't save the intermediate node values.
2. Generating an inclusion proof to show that an item in the list is a leaf of the Merkle tree.
3. Verifying an inclusion proof.
4. And some other functions that we don't need for my verifiable credential selective disclosure implementation.

## Application to VC Selective Disclosure

1. The list in our case is the canonicalized non-mandatory statements from the *issuer*. In detail the salt value concatenated with the non-mandatory statement value.
2. The *issuer* signs the MTH with a specified signature method.
3. The *holder* supplies an inclusion proof for each statement they choose to reveal.
4. The *verifier* verifies the signed MTH with the signature verification algorithm and then verifies each statement by concatenating the corresponding salt in front of the statement and using the verify inclusion algorithm.

## Examples

`example.js` came from Claude. The `VCExample.js` uses intermediate data from selective disclosure algorithms applied to  test vectors. See [VC-Data-Integrity-1.1](https://w3c.github.io/vc-data-integrity/) and [VC-DI-Quantum-Resistant](https://w3c.github.io/vc-di-quantum-resistant/)

## Claude's LLM Text Output:

The module follows RFC 9162 Section 2.1 closely. Proof generation is a direct translation of the recursive PATH(m, D_n) definition, and verification implements the fn/sn bit-shifting algorithm from Section 2.1.3.2 step by step, with the spec's step numbers in the comments.

I (Claude) tested it before handing it over. It reproduces the known 8-leaf root hash from the Certificate Transparency reference test vectors. For every tree size from 1 to 40, every leaf's proof verifies. Proofs are also correctly rejected in three tampered cases: the wrong leaf index, a different leaf, and a truncated path.

Usage:

```

import { MerkleTree, leafHash, verifyInclusion } from "./merkle.js";

const entries = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])]; 

const tree = await MerkleTree.create(entries); 

const { leafIndex, treeSize, inclusionPath } = await tree.inclusionProof(1); 

const ok = await verifyInclusion(await leafHash(entries[1]), leafIndex, treeSize, inclusionPath, tree.root);

```

A few details to be aware of:

    Pass the leaf hash to verifyInclusion, not the raw entry. The RFC's verifier takes hash, meaning HASH(0x00 || entry). Passing raw bytes will always fail.
    The 0x00 and 0x01 prefixes matter. Leaves and internal nodes are hashed with different prefix bytes to prevent second-preimage attacks. This is a common way hand-rolled Merkle trees differ from the RFC, and it's why you can't swap in a generic Merkle library and expect matching roots.
    Everything is async, because it uses Web Crypto's crypto.subtle.digest. That works unchanged in browsers and in Node 19+, Deno, and Bun. If you'd rather have synchronous calls in Node, you can replace sha256 with createHash('sha256') from node:crypto.
    It favors simplicity over speed. Each proof recomputes the subtree hashes it needs, so generating one proof costs O(n) hashes. That's fine for moderate sizes. For large trees or many proofs, you'd cache the internal nodes.
