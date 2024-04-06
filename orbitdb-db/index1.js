import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB, IPFSAccessController } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'

// Create an IPFS instance.
const blockstore = new LevelBlockstore('./ipfs')
const libp2p = await createLibp2p(Libp2pOptions)
const ipfs = await createHelia({ libp2p, blockstore })

const orbitdb = await createOrbitDB({ ipfs })

// const db = await orbitdb.open('position-db', { type: 'documents' })
const db = await orbitdb.open('position-db', { type: 'documents', AccessController: IPFSAccessController({ write: ['*']}) })


console.log('position-db address', db.address)

// Add some records to the db.
await db.put({ _id: 'user1', asset: "BTC", quantity: 0.02, price: 66173.12, date: "01-01-2024", rating: 100 })
await db.put({ _id: 'user2', asset: "ETH", quantity: 0.54, price: 3400.12, date: "01-17-2024", rating: 95 })
await db.put({ _id: 'user3', asset: "SOL", quantity: 3, price: 187.12, date: "04-04-2024", rating: 90.3 })
await db.put({ _id: 'user4', asset: "SHIT", quantity: 3, price: 18.12, date: "04-04-2024", rating: 37 })
await db.put({ _id: 'user5', asset: "FARTK", quantity: 16.25, price: 69.69, date: "04-04-2024", rating: 41 })
await db.put({ _id: 'user6', asset: "MCKURZ", quantity: 100000, price: 0.0072, date: "04-05-2024", rating: 12 })

// Query the database for documents where the asset is "BTC"
const queryResult = await db.query((doc) => doc.asset === "BTC")
const queryResult1 = await db.query((doc) => doc.asset === "ETH")
const queryResult2 = await db.query((doc) => doc.asset === "FARTK")
// const queryResult = await db.query((doc) => doc.asset === "BTC")
// const queryResult = await db.query((doc) => doc.asset === "BTC")
// const queryResult = await db.query((doc) => doc.asset === "BTC")

// Log the query result
console.log("Query result for assets equal to 'BTC':", queryResult)
console.log("Query result for assets equal to 'ETH':", queryResult1)
console.log("Query result for assets equal to 'FARTK':", queryResult2)



// Print out the above records.
console.log(await db.all())

// Close your db and stop OrbitDB and IPFS.
// await db.close()
// await orbitdb.stop()
// await ipfs.stop()