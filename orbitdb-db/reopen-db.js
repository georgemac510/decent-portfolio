// Import required modules
const { createLibp2p } = require('libp2p');
const { createHelia } = require('helia');
const { createOrbitDB, AccessControllers } = require('@orbitdb/core');

// Define function to reopen the database
async function reopenDatabase() {
    try {
        // Create libp2p instance
        const libp2p = await createLibp2p();
        
        // Create IPFS instance
        const ipfs = await createHelia({ libp2p });
        
        // Create OrbitDB instance
        const orbitdb = await createOrbitDB({ ipfs });

        // Address of the existing OrbitDB database
        const dbAddress = '/orbitdb/zdpuAv3Efoai6USwzVbYPFRNW881mSzgGaygwtKFmgbhHkXM1/position-db';

        // Open the database
        const db = await orbitdb.open(dbAddress, {
            accessController: AccessControllers.getAccessController({ type: 'ipfs' })
        });

        console.log('Database reopened successfully:', db.address.toString());

        // Optionally, perform operations on the reopened database here
        // For example: const allRecords = await db.all();

    } catch (error) {
        console.error('Error reopening database:', error);
    }
}

// Call the function to reopen the database
reopenDatabase();
