// import { createLibp2p } from 'libp2p'
// import { createHelia } from 'helia'
// import { createOrbitDB, IPFSAccessController } from '@orbitdb/core'
// import { LevelBlockstore } from 'blockstore-level'
// import { Libp2pOptions } from './config/libp2p.js'

// const main = async () => {  
//   const blockstore = new LevelBlockstore('./ipfs')
//   const libp2p = await createLibp2p(Libp2pOptions)
//   const ipfs = await createHelia({ libp2p, blockstore })

//   // create a random directory to avoid OrbitDB conflicts.
//   let randDir = (Math.random() + 1).toString(36).substring(2)

//   const orbitdb = await createOrbitDB({ ipfs, directory: `./${randDir}/orbitdb` })

//   let db

//   if (process.argv[2]) {
//     db = await orbitdb.open(process.argv[2])
//   } else {
//     // When we open a new database, write access is only available to the 
//     // db creator. If we want to allow other peers to write to the database,
//     // they must be specified in IPFSAccessController write array param. Here,
//     // we simply allow anyone to write to the database. A more robust solution
//     // would use the OrbitDBAccessController to provide mutable, "fine-grain"
//     // access using grant and revoke.
//     db = await orbitdb.open('position-db', { 
//         type: 'documents', 
//         accessController: IPFSAccessController, 
//         accessControllerOptions: { write: ['*'] } 
//     });
  
    
//     // Copy this output if you want to connect a peer to another.
//     console.log('position-db address', '(copy my db address and use when launching peer 2)', db.address)
//   }

//   db.events.on('update', async (entry) => {
//     // what has been updated.
//     console.log('update', entry.payload.value)
//   })
  
//   if (process.argv[2]) {
//       await db.put({ _id: 'user1', asset: "BTC", quantity: 0.02, price: 66173.12, date: "01-01-2024", rating: 1 })
//       await db.put({ _id: 'user2', asset: "ETH", quantity: 0.54, price: 3400.12, date: "01-17-2024", rating: 15 })
//   } else {
//       // write some records
//       await db.put({ _id: 'user3', asset: "SOL", quantity: 3, price: 187.12, date: "04-04-2024", rating: 2 })
//       await db.put({ _id: 'user4', asset: "SHIT", quantity: 3, price: 18.12, date: "04-04-2024", rating: 3 })   
//   }


//   // Clean up when stopping this app using ctrl+c
//   process.on('SIGINT', async () => {
//       // print the final state of the db.
//       console.log((await db.all()).map(e => e.value))
//       // Close your db and stop OrbitDB and IPFS.
//       await db.close()
//       await orbitdb.stop()
//       await ipfs.stop()

//       process.exit()
//   })
// }

// main()

import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB, IPFSAccessController } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'

const main = async () => {  
  const blockstore = new LevelBlockstore('./ipfs')
  const libp2p = await createLibp2p(Libp2pOptions)
  const ipfs = await createHelia({ libp2p, blockstore })

  // create a random directory to avoid OrbitDB conflicts.
  let randDir = (Math.random() + 1).toString(36).substring(2)

  const orbitdb = await createOrbitDB({ ipfs, directory: `./${randDir}/orbitdb` })

  let db

  if (process.argv[2]) {
    db = await orbitdb.open(process.argv[2])
  } else {
    // When we open a new database, write access is only available to the 
    // db creator. If we want to allow other peers to write to the database,
    // they must be specified in IPFSAccessController write array param. Here,
    // we simply allow anyone to write to the database. A more robust solution
    // would use the OrbitDBAccessController to provide mutable, "fine-grain"
    // access using grant and revoke.
    db = await orbitdb.open('position-db', { 
        type: 'documents', 
        accessController: IPFSAccessController, 
        accessControllerOptions: { write: ['*'] } 
    });
    
    // Log the address of the database opened by peer #2
    console.log('Database address:', db.address)
    
    // Copy this output if you want to connect a peer to another.
    console.log('Copy the above address and use it when launching peer #1')
  }

  db.events.on('update', async (entry) => {
    // what has been updated.
    console.log('update', entry.payload.value)
  })
  
  if (!process.argv[2]) {
      // write some records only if this is peer #2
      await db.put({ _id: 'user7', asset: "LTC", trade: "SELL", quantity: 3, price: 175.00, date: "04-05-2024", rating: 2 })
      await db.put({ _id: 'user8', asset: "DOGE", trade: "SELL", quantity: 1000, price: 0.185, date: "04-05-2024", rating: 3 })   
  }


  // Clean up when stopping this app using ctrl+c
  process.on('SIGINT', async () => {
      // print the final state of the db.
      console.log((await db.all()).map(e => e.value))
      // Close your db and stop OrbitDB and IPFS.
      await db.close()
      await orbitdb.stop()
      await ipfs.stop()

      process.exit()
  })
}

main()
