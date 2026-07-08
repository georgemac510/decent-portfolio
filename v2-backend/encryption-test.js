// Standalone encryption probe — tests whether @orbitdb/simple-encryption
// is actually encrypting in our environment, separated from server.js.
//
// Usage:
//   node encryption-test.js write   # create db, write a record
//   node encryption-test.js read    # open existing db, try to read
//
// Run with the correct DB_ENCRYPTION_PASSWORD, then with a wrong one.
// If encryption is working, the wrong-password read should fail.

import 'dotenv/config';
import { createLibp2p } from 'libp2p';
import { createHelia } from 'helia';
import { LevelBlockstore } from 'blockstore-level';
import { LevelDatastore } from 'datastore-level';
import { createOrbitDB, Documents } from '@orbitdb/core';
import SimpleEncryption from '@orbitdb/simple-encryption';
import { libp2pOptions } from './libp2p-config.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const MODE = process.argv[2]; // 'write-events', 'read-events', 'write-docs', 'read-docs'
const TEST_DIR = './encryption-test-data';
const ADDR_EVENTS = `${TEST_DIR}/addr-events.txt`;
const ADDR_DOCS = `${TEST_DIR}/addr-docs.txt`;

const password = process.env.DB_ENCRYPTION_PASSWORD;
if (!password) {
  console.error('DB_ENCRYPTION_PASSWORD required');
  process.exit(1);
}

console.log(`[probe] mode=${MODE} password-prefix=${password.slice(0, 6)}…`);

await mkdir(TEST_DIR, { recursive: true });

const libp2p = await createLibp2p(libp2pOptions);
const blockstore = new LevelBlockstore(`${TEST_DIR}/blocks`);
const datastore = new LevelDatastore(`${TEST_DIR}/datastore`);
const ipfs = await createHelia({ libp2p, blockstore, datastore });
const orbitdb = await createOrbitDB({ ipfs, directory: `${TEST_DIR}/orbitdb` });

const encryption = { data: await SimpleEncryption({ password }) };

if (MODE === 'write-events') {
  const db = await orbitdb.open('events-test', { encryption });
  console.log(`[probe] db address: ${db.address}`);
  await writeFile(ADDR_EVENTS, db.address.toString());
  const hash = await db.add('secret-events-payload');
  console.log(`[probe] added: ${hash}`);
  const value = await db.get(hash);
  console.log(`[probe] read back: ${value}`);
  await db.close();
} else if (MODE === 'read-events') {
  const addr = (await readFile(ADDR_EVENTS, 'utf8')).trim();
  console.log(`[probe] opening ${addr}`);
  try {
    const db = await orbitdb.open(addr, { encryption });
    const all = await db.all();
    console.log(`[probe] all entries:`, all.map((e) => ({ value: e.value })));
    await db.close();
  } catch (err) {
    console.error(`[probe] read failed:`, err.message);
  }
} else if (MODE === 'write-docs') {
  const db = await orbitdb.open('docs-test', {
    Database: Documents({ indexBy: '_id' }),
    encryption,
  });
  console.log(`[probe] db address: ${db.address}`);
  await writeFile(ADDR_DOCS, db.address.toString());
  const hash = await db.put({ _id: 'doc1', secret: 'secret-docs-payload' });
  console.log(`[probe] added: ${hash}`);
  const value = await db.get('doc1');
  console.log(`[probe] read back:`, value);
  await db.close();
} else if (MODE === 'read-docs') {
  const addr = (await readFile(ADDR_DOCS, 'utf8')).trim();
  console.log(`[probe] opening ${addr}`);
  try {
    const db = await orbitdb.open(addr, {
      Database: Documents({ indexBy: '_id' }),
      encryption,
    });
    const all = await db.all();
    console.log(`[probe] all entries:`, all.map((e) => ({ value: e.value })));
    await db.close();
  } catch (err) {
    console.error(`[probe] read failed:`, err.message);
  }
} else {
  console.error('mode required: write-events, read-events, write-docs, read-docs');
}

await orbitdb.stop();
await ipfs.stop();
await libp2p.stop();
process.exit(0);