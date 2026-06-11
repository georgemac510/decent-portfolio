// Browser-side IPFS/OrbitDB lifecycle.
//
// Lazily initializes a single libp2p + Helia + OrbitDB instance on first call
// and caches it for the rest of the session. The browser becomes a real peer
// on the IPFS network, replicates the Decent Portfolio database from Voyager,
// and reads positions/transactions locally.
//
// Configuration via NEXT_PUBLIC env vars in .env.local:
//   NEXT_PUBLIC_USE_P2P=true               -- master switch for Phase B
//   NEXT_PUBLIC_DB_ADDRESS=/orbitdb/...    -- the database to open
//   NEXT_PUBLIC_VOYAGER_MULTIADDR=...      -- WebSocket dial address of Voyager

import { createLibp2p, type Libp2p } from 'libp2p';
import { createHelia, type Helia } from 'helia';
import { createOrbitDB, IPFSAccessController } from '@orbitdb/core';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { multiaddr } from '@multiformats/multiaddr';

// Singleton state — initialized once per browser session.
let initPromise: Promise<{ libp2p: Libp2p; helia: Helia; orbitdb: any; db: any }> | null = null;

async function initialize() {
  const dbAddress = process.env.NEXT_PUBLIC_DB_ADDRESS;
  const voyagerMultiaddr = process.env.NEXT_PUBLIC_VOYAGER_MULTIADDR;

  if (!dbAddress) {
    throw new Error('NEXT_PUBLIC_DB_ADDRESS is required for Phase B');
  }
  if (!voyagerMultiaddr) {
    throw new Error('NEXT_PUBLIC_VOYAGER_MULTIADDR is required for Phase B');
  }

  console.log('[helia] initializing libp2p…');
  const libp2p = await createLibp2p({
    transports: [webSockets()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      pubsub: gossipsub({ allowPublishToZeroTopicPeers: true }),
    },
  });

  console.log('[helia] starting helia…');
  const helia = await createHelia({ libp2p });

  console.log('[helia] dialing voyager at', voyagerMultiaddr);
  await libp2p.dial(multiaddr(voyagerMultiaddr));

  console.log('[helia] starting orbitdb…');
  const orbitdb = await createOrbitDB({ ipfs: helia });

  console.log('[helia] opening database', dbAddress);
  const db = await orbitdb.open(dbAddress, {
    AccessController: IPFSAccessController({ write: ['*'] }),
  });

  console.log('[helia] ready. local peer id:', libp2p.peerId.toString());

  return { libp2p, helia, orbitdb, db };
}

/**
 * Get the singleton Helia/OrbitDB instance. First call initializes; subsequent
 * calls return the cached instance. Safe to call from React components or hooks.
 */
export function getHeliaClient() {
  if (!initPromise) {
    initPromise = initialize();
  }
  return initPromise;
}

/**
 * Whether Phase B is enabled (env flag check, server-side safe).
 */
export const isP2pEnabled = process.env.NEXT_PUBLIC_USE_P2P === 'true';