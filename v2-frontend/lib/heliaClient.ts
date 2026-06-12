// Browser-side IPFS/OrbitDB lifecycle.
//
// Configuration via NEXT_PUBLIC env vars in .env.local:
//   NEXT_PUBLIC_USE_P2P=true               -- master switch for Phase B
//   NEXT_PUBLIC_DB_ADDRESS=/orbitdb/...    -- the database to open
//   NEXT_PUBLIC_VOYAGER_MULTIADDR=...      -- WebSocket dial address of Voyager

// Singleton state — initialized once per browser session.

let initPromise: Promise<{ libp2p: any; helia: any; orbitdb: any; db: any }> | null = null;

async function initialize() {
  // Guard: this function should never run server-side.
  if (typeof window === 'undefined') {
    throw new Error('heliaClient can only be initialized in the browser');
  }

  const dbAddress = process.env.NEXT_PUBLIC_DB_ADDRESS;
  const voyagerMultiaddr = process.env.NEXT_PUBLIC_VOYAGER_MULTIADDR;

  if (!dbAddress) {
    throw new Error('NEXT_PUBLIC_DB_ADDRESS is required for Phase B');
  }
  if (!voyagerMultiaddr) {
    throw new Error('NEXT_PUBLIC_VOYAGER_MULTIADDR is required for Phase B');
  }

  // Dynamic imports — only loaded when this function actually runs (browser only).
  const [
    { createLibp2p },
    { createHelia },
    { createOrbitDB, IPFSAccessController },
    { webSockets },
    { noise },
    { yamux },
    { identify },
    { gossipsub },
    { multiaddr },
  ] = await Promise.all([
    import('libp2p'),
    import('helia'),
    import('@orbitdb/core'),
    import('@libp2p/websockets'),
    import('@chainsafe/libp2p-noise'),
    import('@chainsafe/libp2p-yamux'),
    import('@libp2p/identify'),
    import('@chainsafe/libp2p-gossipsub'),
    import('@multiformats/multiaddr'),
  ]);

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
 * Get the singleton Helia/OrbitDB instance.
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