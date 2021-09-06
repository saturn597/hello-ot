import express from 'express';
import fs from 'fs';
import https from 'https';
import path from 'path';
import ws from 'ws';

import config from './config.js';

import OthelloState from '../src/othellostate.js';

const gameAbortedReasons = {
  // TODO: share code between client and server
  opponentDisconnect: 'opponentDisconnect',
  opponentLeft: 'opponentLeft',
  serverConnectionLost: 'serverConnectionLost',
};


class Game {
  constructor() {
    // "true" plays as black, "false" plays as white
    this.players = { true: null, false: null };

    this.onJoin = () => {};
    this.onEnd = () => {};

    const os = OthelloState.initialState(4, 4);
  }

  getActivePlayers() {
    return [this.players[true], this.players[false]].filter(p =>
      p !== null && p.ws.readyState === ws.OPEN);
  }

  join(player, color) {
    this.players[color] = player;

    this.onJoin();
  }

  end(reason) {
    this.onEnd(this, reason);
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

        // update both players about whether they have an active opponent
        this.sendJson(
          { opponentConnected: this.getActiveOpponent() !== null });
        this.sendOpponent({ opponentConnected: true });
      }

      if ('move' in parsed && this.game) {
        // client moved, so notify other player of the move
        const square = parsed['move'];
        this.sendOpponent({ move: square, player: this.color });
      }

      if ('endGame' in parsed) {
        this.leaveGame(gameAbortedReasons.opponentLeft);
      }
    });

    ws.on('close', e => {
      this.leaveGame(gameAbortedReasons.opponentDisconnect);
    });
  }

  getActiveOpponent() {
    // returns opposing player if they are connected, otherwise returns null
    const opponent = this.game.players[!this.color];
    if (opponent !== null && opponent.ws.readyState === ws.OPEN) {
      return opponent;
    }
    return null;
  }

  leaveGame(reason) {
    if (this.game !== null) {
      this.game.players[this.color] = null;
      this.sendOpponent({ opponentConnected: false });
      this.game.end(reason);
      this.game = null;
    }
  }

  sendJson(msg) {
    this.ws.send(JSON.stringify(msg));
  }

  sendOpponent(msg) {
    // If opponent is connected, send a JSON encoded message to them and return
    // true. Otherwise, do nothing and return false.
    const opponent = this.getActiveOpponent();
    if (opponent !== null) {
      opponent.sendJson(msg);
      return true;
    }
    return false;
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

  gameEnd(game, reason) {

    // Remove game from our list of games if present
    const index = this.games.indexOf(game);
    if (index >= 0) {
      this.games.splice(this.games.indexOf(game), 1);
    }

    game.getActivePlayers().forEach(p => {
      p.sendJson({ gameEnd: reason });
    });

    this.broadcast(JSON.stringify({'waiting': this.countWaiting()}));
  }

  gameJoin() {
    this.broadcast(JSON.stringify({'waiting': this.countWaiting()}));
  }
}


const app = express();
app.use(express.static(config.buildPath));

const options = {
  cert: fs.readFileSync(config.sslCertPath),
  key: fs.readFileSync(config.sslKeyPath),
}
const server = https.createServer(options, app);
server.listen(config.port, () => { console.log('listening') });

new OthelloServer({ server });
