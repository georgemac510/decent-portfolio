// import { createLibp2p } from 'libp2p'
// import { createHelia } from 'helia'
// import { createOrbitDB, IPFSAccessController } from '@orbitdb/core'
// import { LevelBlockstore } from 'blockstore-level'
// import { Libp2pOptions } from './config/libp2p.js'

// // Create an IPFS instance.
// const blockstore = new LevelBlockstore('./ipfs')
// const libp2p = await createLibp2p(Libp2pOptions)
// const ipfs = await createHelia({ libp2p, blockstore })

// const orbitdb = await createOrbitDB({ ipfs })

// // const db = await orbitdb.open('position-db', { type: 'documents' })
// const db = await orbitdb.open('position-db', { 
//     type: 'documents', 
//     accessController: IPFSAccessController, 
//     accessControllerOptions: { write: ['*'] } 
// });
  
  

// console.log('position-db address', db.address)

// // Add some records to the db.
// await db.put({ _id: 'user1', asset: "BTC", trade: "BUY", quantity: 0.02, price: 66173.12, date: "01-01-2024", rating: 100 })
// await db.put({ _id: 'user2', asset: "ETH", trade: "BUY", quantity: 0.54, price: 3400.12, date: "01-17-2024", rating: 95 })
// await db.put({ _id: 'user3', asset: "SOL", trade: "BUY", quantity: 3, price: 187.12, date: "04-04-2024", rating: 90.3 })
// await db.put({ _id: 'user4', asset: "SHIT", trade: "BUY", quantity: 3, price: 18.12, date: "04-04-2024", rating: 37 })
// await db.put({ _id: 'user5', asset: "FARTK", trade: "BUY", quantity: 16.25, price: 69.69, date: "04-04-2024", rating: 41 })
// await db.put({ _id: 'user6', asset: "MCKURZ", trade: "BUY", quantity: 100000, price: 0.0072, date: "04-05-2024", rating: 12 })

// // Query the database for documents where the asset is "BTC"
// const queryResult = await db.query((doc) => doc.asset === "BTC")
// const queryResult1 = await db.query((doc) => doc.asset === "ETH")
// const queryResult2 = await db.query((doc) => doc.asset === "FARTK")
// // const queryResult = await db.query((doc) => doc.asset === "BTC")
// // const queryResult = await db.query((doc) => doc.asset === "BTC")
// // const queryResult = await db.query((doc) => doc.asset === "BTC")

// // Log the query result
// console.log("Query result for assets equal to 'BTC':", queryResult)
// console.log("Query result for assets equal to 'ETH':", queryResult1)
// console.log("Query result for assets equal to 'FARTK':", queryResult2)



// // Print out the above records.
// console.log(await db.all())

// // Close your db and stop OrbitDB and IPFS.
// // await db.close()
// // await orbitdb.stop()
// // await ipfs.stop()

import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB, IPFSAccessController } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { Libp2pOptions } from './config/libp2p.js'
import express from 'express'
import cors from 'cors'; // Import cors module
import bodyParser from 'body-parser'; 

const app = express()

// Use bodyParser middleware for JSON parsing
app.use(bodyParser.json());

// Use cors middleware
app.use(cors());

// Create an IPFS instance.
const blockstore = new LevelBlockstore('./ipfs')
const libp2p = await createLibp2p(Libp2pOptions)
const ipfs = await createHelia({ libp2p, blockstore })

const orbitdb = await createOrbitDB({ ipfs })

const db = await orbitdb.open('position-db', { 
    type: 'documents', 
    accessController: IPFSAccessController, 
    accessControllerOptions: { write: ['*'] } 
});

console.log('position-db address', db.address)

// Add some records to the db.
await db.put({ _id: 'user1', asset: "BTC", trade: "BUY", quantity: 0.02, price: 66173.12, date: "01-01-2024", rating: 100 })
await db.put({ _id: 'user2', asset: "ETH", trade: "BUY", quantity: 0.54, price: 3400.12, date: "01-17-2024", rating: 95 })
await db.put({ _id: 'user3', asset: "SOL", trade: "BUY", quantity: 3, price: 187.12, date: "04-04-2024", rating: 90.3 })
await db.put({ _id: 'user4', asset: "SHIT", trade: "BUY", quantity: 3, price: 18.12, date: "04-04-2024", rating: 37 })
await db.put({ _id: 'user5', asset: "FARTK", trade: "BUY", quantity: 16.25, price: 69.69, date: "04-04-2024", rating: 41 })
await db.put({ _id: 'user6', asset: "MCKURZ", trade: "BUY", quantity: 100000, price: 0.0072, date: "04-05-2024", rating: 12 })

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

// Endpoint to query data
app.get('/api/query', async (req, res) => {
    try {
        // Query the database for documents where the asset is "BTC"
        const queryResult = await db.query((doc) => doc.asset === req.query.asset)
        res.json(queryResult)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.get('/api/query/trade', async (req, res) => {
    try {
        // Query the database for documents where the trade is specified
        const queryResult = await db.query((doc) => doc.trade === req.query.trade)
        res.json(queryResult)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

app.get('/api/query/id', async (req, res) => {
    try {
        // Extract the ID from the query parameters
        const id = req.query.id;

        // Query the database for documents with the specified ID
        const queryResult = await db.query((doc) => doc._id === id);

        // Send the query result as JSON response
        res.json(queryResult);
    } catch (error) {
        // If an error occurs, log it and send an error response
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/add-entry', async (req, res) => {
    try {
        // Extract data from the request body
        const { _id, asset, trade, quantity, price, date, rating } = req.body;

        // Check if there is a previous entry with the same _id
        const prevRecord = await db.get(_id);

        if (prevRecord) {
            // Include the previous hash in the new record
            const prevHash = prevRecord.hash;

            let updatedQuantity = quantity;
            let updatedPrice = price;

            if (trade === 'BUY' && asset === prevRecord.value.asset) {
                // Update quantity based on trade type and asset
                updatedQuantity += prevRecord.value.quantity;

                // Calculate average price based on previous records and new trade price
                const totalPrice = prevRecord.value.price * prevRecord.value.quantity;
                const totalQuantity = prevRecord.value.quantity + quantity;
                updatedPrice = (totalPrice + (price * quantity)) / totalQuantity;
            } else if (trade === 'SELL' && asset === prevRecord.value.asset) {
                // Update quantity based on trade type and asset
                updatedQuantity = prevRecord.value.quantity - quantity;
            }

            // Add the new entry to the database
            await db.put({ _id, asset, trade, quantity: updatedQuantity, price: updatedPrice, date, rating, prevHash });

            res.status(201).json({ message: 'Entry added successfully' });
        } else {
            // If there is no previous entry, add the new entry without a previous hash
            await db.put({ _id, asset, trade, quantity, price, date, rating });

            res.status(201).json({ message: 'Entry added successfully' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Start the Express server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})

