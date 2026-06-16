// OrbitDB + Helia bootstrap.
// Returns an open document store keyed by `_id` so the existing data shape
// (asset, trade, quantity, price, date, rating) ports over directly.

import { createLibp2p } from 'libp2p';
import { createHelia } from 'helia';
import { LevelBlockstore } from 'blockstore-level';
import { LevelDatastore } from 'datastore-level';
import { createOrbitDB, Documents, IPFSAccessController } from '@orbitdb/core';
import SimpleEncryption from '@orbitdb/simple-encryption';
import { libp2pOptions } from './libp2p-config.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const DB_NAME = 'decent-portfolio-v2';
const IPFS_BLOCKS_DIR = './data/ipfs/blocks';
const IPFS_DATASTORE_DIR = './data/ipfs/datastore';
const ORBITDB_DIR = './data/orbitdb';
const ADDRESS_FILE = './data/db-address.txt';

async function loadStoredAddress() {
  try {
    const addr = (await readFile(ADDRESS_FILE, 'utf8')).trim();
    return addr || null;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function saveAddress(addr) {
  await mkdir(dirname(ADDRESS_FILE), { recursive: true });
  await writeFile(ADDRESS_FILE, addr, 'utf8');
}

export async function initOrbitDB() {
  const password = process.env.DB_ENCRYPTION_PASSWORD;
  if (!password) {
    throw new Error('DB_ENCRYPTION_PASSWORD env var is required for encrypted database');
  }

  console.log('[orbitdb] starting libp2p…');
  const libp2p = await createLibp2p(libp2pOptions);

  console.log('[orbitdb] starting helia…');
  const blockstore = new LevelBlockstore(IPFS_BLOCKS_DIR);
  const datastore = new LevelDatastore(IPFS_DATASTORE_DIR);
  const ipfs = await createHelia({ libp2p, blockstore, datastore });

  console.log('[orbitdb] starting orbitdb…');
  const orbitdb = await createOrbitDB({ ipfs, directory: ORBITDB_DIR });

  // Open by stored address if we have one (preserves data across restarts);
  // otherwise create by name and persist the address for next time.
  //
  // We attach IPFSAccessController({ write: ['*'] }) so any identity can
  // write to the log. This is correct for a single-node app: our libp2p
  // peer ID is regenerated on each restart (we don't persist a keypair),
  // which means the *default* access controller — "only the creating
  // identity can write" — would reject every write after the first run.
  // For the eventual browser-side Helia phase, we'd switch to a proper
  // OrbitDBAccessController with grant/revoke.
  const storedAddress = await loadStoredAddress();
  const target = storedAddress || DB_NAME;
  console.log(`[orbitdb] opening database: ${target}`);

  console.log('[orbitdb] initializing encryption…');
  const data = await SimpleEncryption({ password });

  const db = await orbitdb.open(target, {
    Database: Documents({ indexBy: '_id' }),
    AccessController: IPFSAccessController({ write: ['*'] }),
    encryption: { data },
  });

  if (!storedAddress) {
    await saveAddress(db.address.toString());
    console.log(`[orbitdb] persisted new address to ${ADDRESS_FILE}`);
  }

  console.log(`[orbitdb] ready. address: ${db.address}`);
  console.log(`[orbitdb] peer id: ${libp2p.peerId.toString()}`);

  // Log replication updates — useful for debugging when you eventually
  // connect a browser-side Helia peer.
  db.events.on('update', (entry) => {
    console.log('[orbitdb] update:', entry?.payload?.op, entry?.payload?.key);
  });

  // Graceful shutdown so block/datastore writes flush cleanly.
  const shutdown = async () => {
    console.log('[orbitdb] shutting down…');
    try {
      await db.close();
      await orbitdb.stop();
      await ipfs.stop();
      await libp2p.stop();
    } catch (err) {
      console.error('[orbitdb] shutdown error:', err);
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { db, orbitdb, ipfs, libp2p };
}
