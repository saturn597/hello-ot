const config = require('./config.js');

const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
const ws = require('ws');

class Connection {
  constructor(socket, player) {
    this.socket = socket;
    this.player = player;
  }
}

class Game {
  constructor() {
    this.connections = [];
  }

  addConnection(socket) {
    if (this.connections.length > 1) {
      return false;
    }

    // first player is black/true, second player is white/false
    const player = this.connections.length == 0;

    const connection = new Connection(socket, player);
    this.connections.push(connection);

    socket.send(JSON.stringify({ color: player }));
    socket.on('close', () => {
      for (let connection of this.connections) {
        connection.socket.close();
      }
      this.connections = [];
    });

    return connection;
  }
}

const app = express();
app.use(express.static(path.join(__dirname, 'build')));

const options = {
  cert: fs.readFileSync(config.sslCertPath),
  key: fs.readFileSync(config.sslKeyPath),
}
const server = https.createServer(options, app);
server.listen(config.port, () => { console.log('listening') });

const game = new Game();

const wss = new ws.Server({ server });
wss.on('connection', ws => {

  game.addConnection(ws);

  ws.on('message', message => {
    console.log('received: %s', message);
  });

  ws.on('close', e => {

  });

});
