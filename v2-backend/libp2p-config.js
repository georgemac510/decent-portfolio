// Libp2p configuration for Helia + OrbitDB.
// Keeps server.js clean and makes it easy to swap transports later.

import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { identify } from '@libp2p/identify';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';

export const libp2pOptions = {
  addresses: {
    // Listen on a single TCP address. Random port (0) since we only need
    // outbound peer connections for this app — your home node isn't dialable
    // from the public internet anyway (NAT), and OrbitDB doesn't require it.
    listen: ['/ip4/0.0.0.0/tcp/0'],
  },
  transports: [tcp()],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    identify: identify(),
    pubsub: gossipsub({
      // Required when running as a single peer; otherwise pubsub waits for
      // peers before publishing and writes hang.
      allowPublishToZeroTopicPeers: true,
      emitSelf: true,
    }),
  },
};
