# Smart Contracts Audit & Integration Guide

This document covers the SocialAi on-chain identity, claims, and reputation layer: contract roles, threat model, security invariants, audit checklist, and backend ↔ contract test matrix.

---

## Table of Contents

1. [Contract Roles](#contract-roles)
2. [Backend Integration Points](#backend-integration-points)
3. [Threat Model](#threat-model)
4. [Security Invariants](#security-invariants)
5. [Audit Checklist](#audit-checklist)
6. [Test Matrix](#test-matrix)
7. [Environment Variables](#environment-variables)

---

## Contract Roles

| Contract | Role | Network | Status |
|----------|------|---------|--------|
| **IdentityRegistry** | Maps on-chain addresses to SocialAi profile IDs | ETH / BASE | Planned |
| **ClaimsRegistry** | Stores signed identity claims | ETH / BASE | Planned |
| **ReputationRegistry** | Tracks reputation scores per address | BASE | Planned |
| **IndexingOracle** | Emits events consumed by off-chain workers | ETH | Planned |

### IdentityRegistry
- Maps `address → profileId` (UUID string)
- Only the address owner can register or update their mapping
- Emits `IdentityRegistered(address, profileId)` on creation

### ClaimsRegistry
- Stores signed claims: `(address, claimType, claimValue, signature, timestamp)`
- Claim types: `farcaster`, `ethereum`, `ens`, `reddit`
- Requires valid ECDSA signature from the claiming address
- Emits `ClaimAdded(address, claimType, claimValue)`

### ReputationRegistry
- Tracks score per address (0–100 scale)
- Only trusted updater addresses can write scores
- Emits `ReputationUpdated(address, oldScore, newScore)`

### IndexingOracle
- Emits `SyncRequested(address, source)` to trigger off-chain worker syncs
- Protected by owner-only access

---

## Backend Integration Points

The `ContractsAdapter` class (`node/contracts.adapter.js`) provides the bridge:

```js
// Get identity claims (DB + on-chain)
await contractsAdapter.getIdentityClaims(address);

// Get on-chain reputation score
await contractsAdapter.getOnChainReputation(address);

// Verify a proof payload (SIWE / EIP-712)
await contractsAdapter.verifyProof({ address, message, signature, chain });

// Health check all configured RPC endpoints
await contractsAdapter.getChainHealth();
```

Each method contains `TODO` comments marking where real contract reads/writes are needed.

---

## Threat Model

### Replay Attacks
- **Risk**: A signed claim payload replayed on a different network or after expiry
- **Mitigation**: Include `chainId`, `nonce`, and `expiresAt` in the signed payload; validate on-chain and in the backend adapter

### Identity Spoofing
- **Risk**: Attacker claims another user's address
- **Mitigation**: Require ECDSA signature from the claiming address; store and verify signature hash in ClaimsRegistry

### Oracle Manipulation
- **Risk**: Malicious actor manipulates IndexingOracle to trigger unauthorized syncs
- **Mitigation**: Restrict emitter access to a multi-sig owner; rate-limit sync events; validate event signatures in workers

### Front-Running
- **Risk**: Claim transactions observed in mempool and front-run to register same identity
- **Mitigation**: Use commit-reveal scheme for sensitive registrations; deploy on L2 (BASE) for lower block visibility

### Reentrancy
- **Risk**: Malicious callback during ETH transfer in reputation reward logic
- **Mitigation**: Use Checks-Effects-Interactions pattern; apply `ReentrancyGuard` (OpenZeppelin)

### Access Control Bypass
- **Risk**: Unauthorized address updates registry entries
- **Mitigation**: Use OpenZeppelin `Ownable2Step` and role-based access; include tests for unauthorized calls

---

## Security Invariants

The following invariants MUST hold at all times:

1. `ClaimsRegistry`: Only the address owner can add or remove their own claims
2. `ReputationRegistry`: Score is always in range `[0, 100]`
3. `IdentityRegistry`: A single address can only map to one profileId at a time
4. All cross-contract calls are protected against reentrancy
5. Pausing a contract prevents all state-changing operations
6. Upgradeability (if used) requires a multi-sig time-lock of at least 48 hours

---

## Audit Checklist

### Access Control
- [ ] All admin functions gated by `onlyOwner` or role checks
- [ ] `transferOwnership` uses two-step pattern (`Ownable2Step`)
- [ ] Emergency pause function exists and is tested

### Upgradeability
- [ ] Proxy pattern documented and upgrade path clear
- [ ] Storage layout preserved across upgrades
- [ ] Time-lock on upgrade execution (≥ 48h)

### Pausing
- [ ] `pause()` / `unpause()` accessible only by authorized roles
- [ ] All state-modifying functions respect pause state
- [ ] Events emitted on pause/unpause

### Rate Limiting
- [ ] Per-address rate limits on claim registration
- [ ] Per-block rate limits on oracle events
- [ ] Rate limit parameters are configurable by owner

### Reentrancy
- [ ] `ReentrancyGuard` applied to all functions that make external calls or transfer ETH
- [ ] No raw ETH transfers without CEI pattern

### Arithmetic
- [ ] Solidity 0.8+ used (built-in overflow protection)
- [ ] Score calculations use fixed-point math where needed

### Events
- [ ] All state changes emit events
- [ ] Events include enough data for off-chain indexing

---

## Test Matrix

Backend ↔ contract interaction tests (to be implemented in `node/contracts.adapter.test.js` once contracts are deployed):

| Scenario | Backend Method | Contract | Expected Result |
|----------|---------------|----------|-----------------|
| Valid claim registration | `getIdentityClaims(addr)` | ClaimsRegistry | Returns claim list with `verified: true` |
| Non-existent address | `getIdentityClaims(addr)` | ClaimsRegistry | Returns `{ db_claims: [], on_chain: { claims: [] } }` |
| Valid proof | `verifyProof(payload)` | IdentityRegistry (off-chain verify) | `{ valid: true }` |
| Invalid signature | `verifyProof(payload)` | — | `{ valid: false, reason: "..." }` |
| Missing fields | `verifyProof(payload)` | — | `{ valid: false, reason: "Missing required fields..." }` |
| ETH RPC healthy | `getChainHealth()` | — | `{ name: 'ethereum', reachable: true }` |
| ETH RPC down | `getChainHealth()` | — | `{ name: 'ethereum', reachable: false, error: "..." }` |
| Solana RPC healthy | `getChainHealth()` | — | `{ name: 'solana', reachable: true }` |
| High reputation address | `getOnChainReputation(addr)` | ReputationRegistry | `{ score: ≥75, level: 'gold' }` |
| New address | `getOnChainReputation(addr)` | ReputationRegistry | `{ score: <25, level: 'new' }` |

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ETH_RPC_URL` | Ethereum mainnet or testnet RPC endpoint | For ETH chain features |
| `BASE_RPC_URL` | BASE network RPC endpoint | For BASE chain features |
| `SOLANA_RPC_URL` | Solana mainnet or devnet RPC endpoint | For Solana chain features |

All variables are loaded via `process.env` in `ContractsAdapter` — **never hard-code RPC URLs or private keys in source code**.
