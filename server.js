const config = require('./config.js');

const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
const ws = require('ws');


class Game {
  constructor() {
    // "true" plays as black, "false" plays as white
    this.players = { true: null, false: null };

    this.onJoin = () => {};
    this.onEnd = () => {};
  }

  join(player, color) {
    this.players[color] = player;
    this.onJoin();
  }

  end() {
    this.onEnd(this);
  }
}


class Player {
  constructor(ws, server) {
    this.color = null;
    this.game = null;

    this.server = server;
    this.ws = ws;

    ws.on('message', msg => {
      console.log('received: %s', msg);

      const parsed = JSON.parse(msg);

      if ('joinAs' in parsed) {
      // client wants to join a game as a specific color
        const color = parsed['joinAs'];
        this.color = color;
        let game = this.server.getGame(color);
        game.join(this, color);
        this.game = game;
      }

      if ('move' in parsed) {
        // client moved, so notify other player of the move
        const square = parsed['move'];
        const opponent = this.game.players[!this.color];
        if (opponent !== null && opponent.ws.readyState === ws.OPEN) {
          const msg = JSON.stringify({ move: square, player: this.color });
          this.game.players[!this.color].send(msg);
        }
      }
    });

    ws.on('close', e => {
      if (this.game !== null) {
        this.game.end();
        this.game = null;
      }
    });
  }

  send(msg) {
    this.ws.send(msg);
  }
}


class OthelloServer extends ws.Server {
  constructor(options) {
    super(options);

    this.games = [];

    this.on('connection', ws => {
      const player = new Player(ws, this);
      ws.send(JSON.stringify({'waiting': this.countWaiting()}));
    });
  }

  broadcast(msg) {
    // notify all clients on server
    this.clients.forEach(client => {
        if (client.readyState === ws.OPEN) {
          client.send(msg);
        }
    });
  }

  countWaiting() {
    // Count the number of games waiting for a black opponent or white opponent

    let count = { true: 0, false: 0 }
    for (let g of this.games) {
      if (g.players[true] === null) {
        count[true]++;
      }
      if (g.players[false] === null) {
        count[false]++;
      }
    }
    return count;
  }

  getGame(color) {
    // try to find a game waiting for that color
    let game = this.games.find(g => g.players[color] === null);
    if (!game) {
      // create a new game if none available
      game = new Game();
      game.onEnd = this.gameEnd.bind(this);
      game.onJoin = this.gameJoin.bind(this);
      this.games.push(game);
    }
    return game;
  }

  gameEnd(game) {
    const players = [game.players[true], game.players[false]];

    // close all connections
    players.filter(p =>
        p !== null && p.ws.readyState === ws.OPEN
    ).forEach(p => p.ws.close());

    this.games.splice(this.games.indexOf(game), 1);
    this.broadcast(JSON.stringify({'waiting': this.countWaiting()}));
  }

  gameJoin() {
    this.broadcast(JSON.stringify({'waiting': this.countWaiting()}));
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

new OthelloServer({ server });
