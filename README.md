# Decent Portfolio

The Decent Portfolio app allows users to add digital asset transactions, update their new asset position quantity and average price and query these data points all stored on an OrbitDB decentralized database hosted on IPFS/Filecoin.

### Install OrbitDB database locally

    git clone https://github.com/georgemac510/decent-portfolio.git

    cd decent-portfolio/orbitdb-db

    nvm install 20

    npm install

** If errors related to `libp2p`, you may need to install it manually with;

    npm install libp2p

### Commands to create Peer #1 and Peer #2 locally

Peer #1:

    node index1.js 
    
    Output:

    position-db address /orbitdb/zdpuAvMs33GVUxYFQwjGufiszEhDUZ7c1XZc7dPMavgZHoWo2

Peer #2:
**Peer #2 must be started with the address of Peer #1

    node index.js /orbitdb/zdpuAys9Qjmz3CLzmtafrCkUAP8pTu1c8je1hgofue1zmd

### Running app as a local Docker container


### Ngrok endpoint

    ngrok http --domain=orbitdb-server.ngrok.dev http://172.18.0.2:3000








