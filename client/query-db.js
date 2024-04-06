import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB, IPFSAccessController } from '@orbitdb/core'

async function main() {
  try {
    // Create libp2p instance
    const libp2p = await createLibp2p()
    console.log('Libp2p instance:', libp2p)

    // Create IPFS instance
    const ipfs = await createHelia({ libp2p })
    console.log('IPFS instance:', ipfs)

    // Create OrbitDB instance
    const orbitdb = await createOrbitDB({ ipfs })
    console.log('OrbitDB instance:', orbitdb)

    // Address of the OrbitDB database
    const dbAddress = '/orbitdb/zdpuAv3Efoai6USwzVbYPFRNW881mSzgGaygwtKFmgbhHkXM1/position-db'

    // Open the database
    const db = await orbitdb.open(dbAddress, {
      accessController: IPFSAccessController,
      accessControllerOptions: { write: ['*'] }
    })
    console.log('Database instance:', db)

    // Query the database
    const queryResult = await db.query((doc) => doc.asset === "BTC")
    console.log("Query result for assets equal to 'BTC':", queryResult)

    // Print out all records
    const allRecords = await db.all()
    console.log("All records:", allRecords)

    // Close the database and IPFS when done
    await db.close()
    await orbitdb.stop()
    await ipfs.stop()
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
