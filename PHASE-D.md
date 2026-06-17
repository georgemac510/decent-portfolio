# Phase D: Upgrade to core 3.x, switch from Voyager to relay-pinner, add encryption

## Discovery (2026-06-16)

- `@orbitdb/simple-encryption@0.0.2` requires `@orbitdb/core@^3.0.1`
- Our stack at the time: `@orbitdb/core@2.5.0` (matching Voyager 0.0.3's pin)
- Encryption option was silently ignored at core 2.x — wrong-password queries succeeded
- Voyager hasn't been updated to track core 3.x; most recent commit (df74202, March 2025) bumped to 2.5.0

## Path forward

`orbitdb-relay-pinner` (NiKrause/orbitdb-relay-pinner) targets `@orbitdb/core@^3.0.2` and is actively maintained (v0.9.1 as of April 2026). Confirmed to run cleanly in our environment.

## Working version combination (2026-06-17, validated by sandbox probe)

- `@orbitdb/core`: 3.0.2
- `@orbitdb/simple-encryption`: 0.0.2
- `helia`: 5.5.1
- `libp2p`: 2.10.0
- `blockstore-level`: 2.0.5 (downgrade from 4.0.1 was required — 4.x returns blocks in a format incompatible with helia 5's pin walker)
- `datastore-level`: 11.0.4

Sandbox at `~/orbitdb-upgrade-probe/` reproduces the working combo and serves as a reference for the next backend.

Database addresses are stable across the 2.5.0 → 3.0.2 upgrade — manifest hashing for `Documents` with our config produces the same `/orbitdb/zdpuAnjx4x4T5vn3sGEAZWLHz9TjVsfReCWmc4icbgDjcFbgR` address. On-disk oplog data written by 2.5.0 reads as empty under 3.0.2 (format change), so existing entries are effectively orphaned. Acceptable for our test data; fresh writes work cleanly under the new version.

## Milestones

1. ✅ Get relay-pinner running locally in isolation
2. ✅ Upgrade backend Decent Portfolio to core 3.x (in-place upgrade complete; Voyager removed from deps and commented out in server.js; backend writes and reads work under core 3.0.2)
3. ⬜ Rewrite backend Voyager integration to use relay-pinner's HTTP `/pinning/*` API
4. ⬜ Upgrade frontend to core 3.x
5. ⬜ Add encryption, verify with wrong-password test
6. ⬜ Production deployment: replace voyager.service with relay-pinner under systemd

## Open issue: encryption still not engaging at core 3.0.2 (2026-06-17)

Repeated the wrong-password test after the core 3.0.2 upgrade. Same failure mode as on 2.5.0: backend started with `DB_ENCRYPTION_PASSWORD=WRONG_KEY_TEST_3X` (verified via `/proc/<pid>/environ`), and `curl /api/positions` returned the correct cleartext data anyway.

This means the version-mismatch hypothesis from yesterday was incomplete. Encryption requires core 3.x — necessary — but is not sufficient. Something else about our setup is preventing the encryption layer from engaging.

Suspects to investigate next session:
- Documents store may not honor the `encryption` option the way the Events store does (the simple-encryption tests only cover Events)
- Interaction between `Database: Documents(...)`, `AccessController: IPFSAccessController(...)`, and `encryption: { data }` in our `orbitdb.open()` call
- `LevelBlockstore` + Documents + encryption integration specifics

Until this is resolved, the README must not claim encryption.

## Local backups to clean up after upgrade is fully verified

- `~/decent-portfolio/v2-backend/package.json.bak-pre-3x`
- `~/decent-portfolio/v2-backend/package-lock.json.bak-pre-3x`
- `~/decent-portfolio/v2-backend/data.bak-pre-encryption-20260616-115026/`
- `~/voyager-data-bak/host-ipfs-*` and `host-orbitdb-*`