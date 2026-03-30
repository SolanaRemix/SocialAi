/**
 * Contracts Adapter
 *
 * Bridges the SocialAi backend to on-chain identity, claims and reputation
 * data.  Real chain-specific calls are marked with TODO comments; the
 * current implementation provides deterministic mock responses so the API
 * layer is fully functional before chain integrations are completed.
 */

// ============================================================================
// CONTRACTS ADAPTER CLASS
// ============================================================================

export class ContractsAdapter {
  /**
   * @param {import('pg').Pool} db
   * @param {{ ETH_RPC_URL?: string, BASE_RPC_URL?: string, SOLANA_RPC_URL?: string }} env
   */
  constructor(db, env = {}) {
    this.db = db;
    this.ethRpcUrl = env.ETH_RPC_URL || null;
    this.baseRpcUrl = env.BASE_RPC_URL || null;
    this.solanaRpcUrl = env.SOLANA_RPC_URL || null;
  }

  // --------------------------------------------------------------------------
  // Identity Claims
  // --------------------------------------------------------------------------

  /**
   * Return all identity claims for a given on-chain address.
   * Combines database records with a mock on-chain data stub.
   *
   * TODO: Replace mock on-chain call with actual contract read via ethers.js
   *       or @solana/web3.js once the identity contract is deployed.
   *
   * @param {string} address  Ethereum / Solana address
   * @returns {Promise<{ db_claims: Object[], on_chain: Object }>}
   */
  async getIdentityClaims(address) {
    let dbClaims = [];
    try {
      const result = await this.db.query(
        `SELECT c.*, p.username, p.display_name
         FROM claims c
         LEFT JOIN profiles p ON c.profile_id = p.id
         WHERE c.claim_value ILIKE $1
         ORDER BY c.created_at DESC`,
        [address]
      );
      dbClaims = result.rows;
    } catch (err) {
      console.error('[Contracts] getIdentityClaims DB error:', err.message);
    }

    // TODO: Replace with real contract call:
    //   const contract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, abi, provider);
    //   const onChain = await contract.getClaims(address);
    const onChain = {
      address,
      mock: true,
      claims: dbClaims.map(c => ({ type: c.claim_type, verified: c.verified }))
    };

    return { db_claims: dbClaims, on_chain: onChain };
  }

  // --------------------------------------------------------------------------
  // On-Chain Reputation
  // --------------------------------------------------------------------------

  /**
   * Return a mock reputation score for the given address.
   *
   * TODO: Replace with actual on-chain reputation contract read.
   *       Candidate contract: ReputationRegistry on BASE network.
   *
   * @param {string} address
   * @returns {Promise<{ address: string, score: number, level: string, mock: boolean }>}
   */
  async getOnChainReputation(address) {
    // Deterministic mock based on address hash (last 4 hex chars as number)
    const hashPart = address.slice(-4);
    const score = parseInt(hashPart, 16) % 100;
    const level = score >= 75 ? 'gold' : score >= 50 ? 'silver' : score >= 25 ? 'bronze' : 'new';

    // TODO: Replace with actual RPC call using ethRpcUrl / baseRpcUrl
    return { address, score, level, mock: true };
  }

  // --------------------------------------------------------------------------
  // Proof Verification
  // --------------------------------------------------------------------------

  /**
   * Validate the structure of a proof payload and return a mock verification.
   *
   * TODO: Implement EIP-712 / Farcaster signed proof verification.
   *       Requires: ethers.js `verifyTypedData()` or SIWE `verify()`.
   *
   * @param {{ address: string, message: string, signature: string, chain?: string }} proofPayload
   * @returns {Promise<{ valid: boolean, reason: string, mock: boolean }>}
   */
  async verifyProof(proofPayload) {
    const { address, message, signature, chain = 'ethereum' } = proofPayload ?? {};

    if (!address || !message || !signature) {
      return { valid: false, reason: 'Missing required fields: address, message, signature', mock: false };
    }

    if (typeof address !== 'string' || address.length < 10) {
      return { valid: false, reason: 'Invalid address format', mock: false };
    }

    if (typeof signature !== 'string' || signature.length < 10) {
      return { valid: false, reason: 'Invalid signature format', mock: false };
    }

    // TODO: Replace with actual signature verification
    return { valid: true, reason: 'Mock verification passed', address, chain, mock: true };
  }

  // --------------------------------------------------------------------------
  // Chain Health
  // --------------------------------------------------------------------------

  /**
   * Check reachability of all configured RPC endpoints.
   *
   * @returns {Promise<{ chains: Object[], overall_healthy: boolean }>}
   */
  async getChainHealth() {
    const chains = await Promise.all([
      this._checkRpc('ethereum', this.ethRpcUrl),
      this._checkRpc('base', this.baseRpcUrl),
      this._checkRpc('solana', this.solanaRpcUrl)
    ]);

    const overall_healthy = chains.every(c => c.reachable || !c.configured);

    return { chains, overall_healthy };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Lightweight reachability check for an RPC endpoint.
   * Uses a generic JSON-RPC eth_blockNumber or Solana getHealth call.
   *
   * @param {string} name
   * @param {string|null} url
   * @returns {Promise<{ name: string, configured: boolean, reachable: boolean, latency_ms: number|null, error?: string }>}
   */
  async _checkRpc(name, url) {
    if (!url) {
      return { name, configured: false, reachable: false, latency_ms: null };
    }

    const start = Date.now();
    try {
      const body = name === 'solana'
        ? JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' })
        : JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(5000)
      });

      const latency_ms = Date.now() - start;

      if (response.ok) {
        return { name, configured: true, reachable: true, latency_ms };
      }

      return { name, configured: true, reachable: false, latency_ms, error: `HTTP ${response.status}` };
    } catch (err) {
      return { name, configured: true, reachable: false, latency_ms: Date.now() - start, error: err.message };
    }
  }
}
