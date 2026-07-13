# Phase D: Upgrade to core 3.x, switch from Voyager to relay-pinner, add encryption

## Discovery (2026-06-16)

- `@orbitdb/simple-encryption@0.0.2` requires `@orbitdb/core@^3.0.1`
- Our stack at the time: `@orbitdb/core@2.5.0` (matching Voyager 0.0.3's pin)
- Encryption option was silently ignored at core 2.x — wrong-password queries succeeded
- Voyager hasn't been updated to track core 3.x; most recent commit (df74202, March 2025) bumped to 2.5.0

## Path forward

`orbitdb-relay-pinner` (NiKrause/orbitdb-relay-pinner) targets `@orbitdb/core@^3.0.2` and is actively maintained (v0.9.1 as of April 2026). Confirmed to run cleanly in our environment.

## Working version combination (validated by sandbox probe, 2026-06-17)

- `@orbitdb/core`: 3.0.2
- `@orbitdb/simple-encryption`: 0.0.2
- `helia`: 5.5.1
- `libp2p`: 2.10.0
- `blockstore-level`: 2.0.5 (downgrade from 4.0.1 was required — 4.x returns blocks in a format incompatible with helia 5's pin walker)
- `datastore-level`: 11.0.4

Sandbox at `~/orbitdb-upgrade-probe/` reproduces the working combo and serves as a reference.

Database addresses are stable across the 2.5.0 → 3.0.2 upgrade — manifest hashing for `Documents` with our config produces the same `/orbitdb/zdpuAnjx4x4T5vn3sGEAZWLHz9TjVsfReCWmc4icbgDjcFbgR` address. On-disk oplog data written by 2.5.0 reads as empty under 3.0.2 (format change), so existing entries are effectively orphaned. Acceptable for our test data; fresh writes work cleanly under the new version.

## Encryption root cause and fix (2026-06-19)

Wednesday's wrong-password test still returned cleartext after the core 3.0.2 upgrade. The hypothesis space narrowed Friday morning with a focused sandbox test comparing Events and Documents stores side by side:

- Events store with wrong password → `Could not decrypt payload` error ✓
- Documents store with wrong password → cleartext returned ✗

Root cause: `src/databases/documents.js` in `@orbitdb/core@3.0.2` destructures `encrypt` (no `-ion` suffix) instead of `encryption`, and forwards the undefined `encrypt` to the underlying `Database` constructor. Every other store type (Events, KeyValue, KeyValueIndexed) destructures and forwards `encryption` correctly. The bug also exists on the project's `main` branch.

Fix is a two-character change on two adjacent lines: `encrypt` → `encryption` in both the function signature and the `Database({...})` call. Also fixes a separate small bug where `onUpdate` was destructured but not forwarded.

Hot-patched both `~/decent-portfolio/v2-backend/node_modules/@orbitdb/core/src/databases/documents.js` and `~/orbitdb-upgrade-probe/node_modules/@orbitdb/core/src/databases/documents.js`. Re-ran the sandbox probe — wrong-password test now produces the expected `Could not decrypt payload` error on the Documents store. End-to-end verified on the live backend: wrong-password queries return `{"error":"failed to compute positions"}` with `Could not decrypt payload` in the logs; correct password reads cleanly.

Upstream issue filed: https://github.com/orbitdb/orbitdb/issues/1253

## Milestone 3 progress (2026-06-24)

### ✅ Chunk 1: Relay-pinner as systemd service
- Unit: ~/.config/systemd/user/relay-pinner.service (enabled)
- Data dir: ~/relay-pinner-data/ (datastore, env file, peer-id.txt)
- Env file: ~/relay-pinner-data/relay-pinner.env with RELAY_PRIV_KEY,
  ports (TCP 9191, WS 9192, WebRTC 9193, QUIC 9194, Metrics 9290),
  ENABLE_GENERAL_LOGS=1, ENABLE_SYNC_LOGS=1, DATASTORE_PATH
- Persistent peer ID: 12D3KooWGhiz5y1AoddfkvtmWffZ82hYpcg94Wq7rx3wg5e9oeis
- Verified: survives restart

### 🟡 Chunk 2: Backend integration (partial)
- server.js: dials relay-pinner via libp2p, then fires POST /pinning/sync
  (fire-and-forget, 60s AbortController timeout)
- Imports: node-fetch and @multiformats/multiaddr restored
- libp2p-config.js: added pubsubPeerDiscovery service on
  todo._peer-discovery._p2p._pubsub topic
- Env vars: RELAY_PINNER_HTTP, RELAY_PINNER_MULTIADDR in backend .env
- Verified: HTTP registration succeeds, relay-pinner's /pinning/databases
  lists our address
- 🟡 BUT: OrbitDB pubsub updates from backend don't reach relay-pinner.
  When a new write hits backend, relay-pinner doesn't see the update event.
  Both peers connected at libp2p level, both subscribed to OrbitDB topic.
  Issue is gossipsub mesh formation specifically on the OrbitDB heads topic.

### Open question for next session

Why doesn't gossipsub mesh form on the OrbitDB heads topic between backend
and relay-pinner?

Two paths to investigate:
1. Enable more gossipsub logging on backend side (DEBUG=libp2p:gossipsub:*)
   to see what backend's gossipsub is doing
2. Consider Mode 2: embed orbitdbReplicationService() directly in backend's
   libp2p instead of running relay-pinner as a separate daemon — eliminates
   the cross-process mesh formation entirely
3. Ask on OrbitDB community channel (Nico Krause) about expected mesh
   behavior between backend and relay-pinner peers

### Chunk 3 (browser end-to-end): not started
Will pick up after Chunk 2 is fully closed.

## Milestone 4 progress (2026-06-23)

Frontend upgraded to `@orbitdb/core@3.0.2`. Same documents.js typo patched in 
frontend's node_modules. Empirical verification: the patch makes the browser 
correctly engage the encryption code path during sync — wrong/missing entries 
now surface as "Could not decrypt payload" errors at `entry.js:186` / 
`sync.js:161`, where before they would silently pass through.

Side finding: Voyager's database state from June 16-17 (pre-patch) had entries 
that were never actually encrypted, despite the backend trying to. The browser 
correctly refused to decrypt these. Voyager wiped clean today (data moved to 
~/voyager-data-bak/). Voyager keystore preserved so peer ID stays stable.

Open: end-to-end "browser P2P with encryption against a live pinning peer" 
remains unvalidated. The backend doesn't currently register the database with 
any pinning peer (Voyager registration commented out during Milestone 2; 
Milestone 3 will replace it with relay-pinner). The visible production page 
still renders via HTTP fallback.

## Strategic deferral note (2026-07-07)

Milestone 3 (relay-pinner replacing Voyager) is intentionally paused, not abandoned.

Rationale: priority is shifting to work on the LLM insight layer (Hyperliquid Info API
integration + Claude reasoning + on-screen AI analyst) as the next visible feature.
Milestone 3 is engineering hygiene — necessary for scale, but not a prerequisite for
the insight layer to ship.

Production impact of the pause: none. Backend serves via HTTP fallback; users see
correct data. The gossipsub mesh gap is characterized and documented; resuming this
work later starts from a clear problem statement.

Revisit: after the insight layer (Phase E) is shipped.

## Milestones

1. ✅ Get relay-pinner running locally in isolation
2. ✅ Upgrade backend Decent Portfolio to core 3.x (in-place upgrade complete; Voyager removed from deps and commented out in server.js; backend writes and reads work under core 3.0.2)
3. 🟡 Rewrite backend Voyager integration to use relay-pinner's HTTP `/pinning/*` API — Chunk 1 done, Chunk 2 partial (gossipsub mesh gap), Chunk 3 not started. **Deferred pending Phase E (LLM insight layer).** See "Strategic deferral" note below.
4. 🟡 Upgrade frontend to core 3.x (mechanically complete, end-to-end validation deferred with Milestone 3)
5. 🟡 Encryption working locally via hot-patch; needs upstream merge or local `patch-package` setup to survive `npm install`. Wrong-password test passes empirically on the live backend.
6. ⬜ Production deployment: replace voyager.service with relay-pinner under systemd — depends on Milestone 3 completion

## Open follow-ups

- Open PR against `orbitdb/orbitdb` with the documents.js fix and a test case for simple-encryption mirroring its Events-store tests
- Decide local-shipping strategy for the patch: `patch-package`, vendored fork, or wait for upstream merge
- Frontend upgrade (Milestone 4) — needs the same blockstore-level/datastore-level version pinning and the same documents.js patch
- Milestone 3 (relay-pinner replacing Voyager) — chunks 1 & 2 partial (see Milestone 3 progress and Strategic deferral note above). Chunk 3 not started.
- Stack currency: Nico Krause's reference simple-todo example (July 2026) runs on OrbitDB 4 + Helia 7 + libp2p 3. Decent Portfolio is one major version behind on each. Not blocking, but a future consideration when returning to Milestone 3.

## Local backups to clean up after upgrade is fully stable

- `~/decent-portfolio/v2-backend/package.json.bak-pre-3x`
- `~/decent-portfolio/v2-backend/package-lock.json.bak-pre-3x`
- `~/decent-portfolio/v2-backend/data.bak-pre-encryption-20260616-115026/`
- `~/decent-portfolio/v2-backend/data.bak-pre-encryption-engaged-20260619-114433/` (or similar timestamp)
- `~/voyager-data-bak/host-ipfs-*` and `host-orbitdb-*`