// merkle.js — Merkle tree inclusion proofs per RFC 9162, Section 2.1
// Hash: SHA-256 via Web Crypto (browsers, Node 19+, Deno, Bun).
// All hashing is async because crypto.subtle.digest is async.

const LEAF_PREFIX = 0x00;
const NODE_PREFIX = 0x01;

async function sha256(bytes) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

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
export async function leafHash(data) {
  return sha256(concat(Uint8Array.of(LEAF_PREFIX), data));
}

// HASH(0x01 || left || right)
async function nodeHash(left, right) {
  return sha256(concat(Uint8Array.of(NODE_PREFIX), left, right));
}

// MTH over a slice of precomputed leaf hashes [start, end).
async function subtreeHash(leafHashes, start, end) {
  const n = end - start;
  if (n === 0) return sha256(new Uint8Array(0)); // MTH({}) = HASH()
  if (n === 1) return leafHashes[start];
  const k = splitPoint(n);
  return nodeHash(
    await subtreeHash(leafHashes, start, start + k),
    await subtreeHash(leafHashes, start + k, end)
  );
}

// PATH(m, D[start:end]) — Section 2.1.3.1
async function path(m, leafHashes, start, end) {
  const n = end - start;
  if (n <= 1) return [];
  const k = splitPoint(n);
  if (m < k) {
    return [
      ...(await path(m, leafHashes, start, start + k)),
      await subtreeHash(leafHashes, start + k, end),
    ];
  }
  return [
    ...(await path(m - k, leafHashes, start + k, end)),
    await subtreeHash(leafHashes, start, start + k),
  ];
}

export class MerkleTree {
  /** @param {Uint8Array[]} entries */
  static async create(entries) {
    const tree = new MerkleTree();
    tree.leafHashes = await Promise.all(entries.map(leafHash));
    tree.root = await subtreeHash(tree.leafHashes, 0, tree.leafHashes.length);
    return tree;
  }

  get size() {
    return this.leafHashes.length;
  }

  /**
   * Inclusion proof for the entry at leafIndex.
   * @returns {{ leafIndex: number, treeSize: number, inclusionPath: Uint8Array[] }}
   */
  async inclusionProof(leafIndex) {
    if (!Number.isInteger(leafIndex) || leafIndex < 0 || leafIndex >= this.size) {
      throw new RangeError(`leafIndex ${leafIndex} out of range for tree of size ${this.size}`);
    }
    return {
      leafIndex,
      treeSize: this.size,
      inclusionPath: await path(leafIndex, this.leafHashes, 0, this.size),
    };
  }
}

/**
 * Verify an inclusion proof — Section 2.1.3.2.
 * @param {Uint8Array} leaf      leaf hash, i.e. await leafHash(entry) — NOT the raw entry
 * @param {number} leafIndex
 * @param {number} treeSize
 * @param {Uint8Array[]} inclusionPath
 * @param {Uint8Array} rootHash
 */
export async function verifyInclusion(leaf, leafIndex, treeSize, inclusionPath, rootHash) {
  // Step 1
  if (leafIndex >= treeSize) return false;

  // Step 2 (use BigInt-free numbers; safe up to 2^53 leaves)
  let fn = leafIndex;
  let sn = treeSize - 1;

  // Step 3
  let r = leaf;

  // Step 4
  for (const p of inclusionPath) {
    if (sn === 0) return false; // 4a
    if (fn % 2 === 1 || fn === sn) { // 4b
      r = await nodeHash(p, r);
      if (fn % 2 === 0) {
        while (fn % 2 === 0 && fn !== 0) {
          fn = Math.floor(fn / 2);
          sn = Math.floor(sn / 2);
        }
      }
    } else {
      r = await nodeHash(r, p);
    }
    // 4c
    fn = Math.floor(fn / 2);
    sn = Math.floor(sn / 2);
  }

  // Step 5
  return sn === 0 && bytesEqual(r, rootHash);
}
