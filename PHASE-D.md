# Phase D: Upgrade to core 3.x, switch from Voyager to relay-pinner, add encryption

## Discovery (2026-06-16)

- `@orbitdb/simple-encryption@0.0.2` requires `@orbitdb/core@^3.0.1`
- Our stack: `@orbitdb/core@2.5.0` (matching Voyager 0.0.3's pin)
- Encryption option is silently ignored at core 2.x — wrong-password queries succeed
- Voyager hasn't been updated to track core 3.x; most recent commit (df74202, March 2025) bumped to 2.5.0

## Path forward

`orbitdb-relay-pinner` (NiKrause/orbitdb-relay-pinner) targets `@orbitdb/core@^3.0.2` and is actively maintained (v0.9.1 as of April 2026). Confirmed to run cleanly in our environment.

## Milestones

1. ✅ Get relay-pinner running locally in isolation
2. ⬜ Upgrade backend Decent Portfolio to core 3.x
3. ⬜ Rewrite backend Voyager integration to use relay-pinner's HTTP `/pinning/*` API
4. ⬜ Upgrade frontend to core 3.x
5. ⬜ Add encryption, verify with wrong-password test
6. ⬜ Production deployment: replace voyager.service with relay-pinner under systemd