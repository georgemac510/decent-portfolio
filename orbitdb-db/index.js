import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'

// Create an IPFS instance.
const blockstore = new LevelBlockstore('./ipfs')
const libp2p = await createLibp2p(Libp2pOptions)
const ipfs = await createHelia({ libp2p, blockstore })

const orbitdb = await createOrbitDB({ ipfs })

const db = await orbitdb.open('my-documents-db', { type: 'documents' })

console.log('orbit-one address', db.address)

// Add some records to the db.
await db.put({ _id: 'doc1', cats: "black", name: "MEEP", crying: 5, sleeping: 1, personality: "meepish" })
await db.put({ _id: 'doc2', cats: "grey", name: "MEW", crying: 0, sleeping: 1, personality: "mewish" })


// Print out the above records.
console.log(await db.all())

// Close your db and stop OrbitDB and IPFS.
await db.close()
await orbitdb.stop()
await ipfs.stop()