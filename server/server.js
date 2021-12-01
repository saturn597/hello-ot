import express from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import ws from 'ws';
import yargs from 'yargs';

import clientConfig from '../src/config.js';

import OthelloState from '../src/othelloState.js';


const argv = yargs(process.argv.slice(2))
  .alias('c', 'config')
  .nargs('config', 1)
  .argv;

// Use config file given in the command line, or use default path
const config = JSON.parse(fs.readFileSync(
  argv.config ? argv.config : path.join(__dirname, '../config.json')
));

const gameAbortedReasons = clientConfig.gameAbortedReasons;
const proto = config.secure ? https : http;


class Game {
  constructor() {
    // "true" plays as black, "false" plays as white
    this.players = { true: null, false: null };

    this.unassignedPlayer = null;  // a player who hasn't picked a color

    this.onJoin = () => {};
    this.onEnd = () => {};

    this.os = OthelloState.initialState(
      clientConfig.boardWidth, clientConfig.boardHeight);
  }

  getActivePlayers() {
    return [this.players[true], this.players[false]].filter(p =>
      p !== null && p.ws.readyState === ws.OPEN);
  }

  colorConnected(color) {
    const p = this.players[color];
    return p !== null && p.ws.readyState === ws.OPEN;
  }

  end(reason) {
    this.onEnd(this, reason);
  }

  getColorOf(player) {
    // Get color a player is playing as
    const res = [true, false].find(p => this.players[p] === player);
    return res;
  }

  getOpponent(player) {
    const color = this.getColorOf(player);
    if (color === undefined) {
      return undefined;
    }
    return this.players[!color];
  }

  join(player, color) {
    if (color === null) {
      this.joinUnassigned(player);
    } else if ([true, false].includes(color)) {
      this.joinAssigned(player, color);
    } else {
      console.log('Got invalid color: ' + color);
    }
  }

  joinAssigned(player, color) {
    this.players[color] = player;

    if (this.unassignedPlayer !== null) {
      this.players[!color] = this.unassignedPlayer;
    }

    // Confirm colors for both players
    this.sendPlayerJson(true, {'color': true});
    this.sendPlayerJson(false, {'color': false});

    // update both players about whether they have an active opponent
    this.sendPlayerJson(color,
      { opponentConnected: this.colorConnected(!color) });
    this.sendPlayerJson(!color, { opponentConnected: true });

    this.onJoin();
  }

  joinUnassigned(player) {
    // add a player who hasn't picked a color

    if (this.players[true]) {
      // someone else is playing black, so make this player white
      this.joinAssigned(player, false);
    } else if (this.players[false]) {
      // someone else is playing white, so make this player black
      this.joinAssigned(player, true);
    } else if (this.unassignedPlayer) {
      // the second player is also unassigned, so assign both colors
      // arbitrarily
      this.players[true] = this.unassignedPlayer;
      this.joinAssigned(player, false);
    } else {
      // no other player in this game, so just add an unassigned player and
      // wait
      this.unassignedPlayer = player;
      this.onJoin();
    }
  }

  leaveGame(player, reason) {
    const color = this.getColorOf(player);
    if (color === undefined && !this.unassignedPlayer === player) {
      console.log('Player asked to leave but isn\'t in game');
      return;
    }

    if (color !== undefined) {
      this.sendPlayerJson(!color, { opponentConnected: false });
    }

    this.end(reason);
  }

  move(player, square) {
    const color = this.getColorOf(player);
    if (color === undefined) {
      console.log('Player asked to move but isn\'t in game');
      return;
    }

    if (color !== this.os.currentPlayer) {
      console.log('wrong color: ' + color);
      return;
    }
    const newState = this.os.move(square);
    if (newState !== null) {
      // os.move will return null if move is invalid
      this.os = newState;
      this.sendPlayerJson(!color, { move: square, player: color });
    } else {
      console.log('invalid move: ' + square);
    }
  }

  sendPlayerJson(color, message) {
    const p = this.players[color];
    if (p && p.ws.readyState === ws.OPEN) {
      p.sendJson(message);
    }
  }
}


class Player {
  constructor(ws, server) {
    this.game = null;

    this.server = server;
    this.ws = ws;

    ws.on('message', msg => {
      console.log('received: %s', msg);

      let parsed;
      try {
        parsed = JSON.parse(msg);  // exception if msg isn't valid json
        '' in parsed;              // exception if parsed isn't an object
      } catch(e) {
        console.log('got invalid message from client: ' + msg);
        return;
      }

      if ('joinAs' in parsed) {
        // client wants to join a game as a specific color
        const color = parsed['joinAs'];

        let game = this.server.getGame(color);
        game.join(this, color);
        this.game = game;
      }

      if ('move' in parsed && this.game) {
        // client moved
        const square = parsed['move'];
        this.game.move(this, square);
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
    // returns opposing player if they are connected, otherwise returns undefined
    const opponent = this.game.getOpponent(this);
    if (opponent !== undefined && opponent.ws.readyState === ws.OPEN) {
      return opponent;
    }
    return undefined;
  }

  leaveGame(reason) {
    if (this.game !== null) {
      this.game.leaveGame(this, reason);
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
    if (opponent !== undefined) {
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
    // If "color" is null, return any game that's waiting for either color.
    // Otherwise, return any game that's waiting for the requested color.
    // Create a game if none is available.

    let finder = color === null ?
        g => g.players[true] === null || g.players[false] === null :
        g => g.players[color] === null;

    let game = this.games.find(finder);

    if (!game) {
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
app.use(express.static(path.join(__dirname, config.filePath)));

const options = {
  cert: fs.readFileSync(path.join(__dirname, config.sslCertPath)),
  key: fs.readFileSync(path.join(__dirname, config.sslKeyPath)),
}
const server = proto.createServer(options, app);
server.listen(config.port, () => {
  console.log('listening on port: ' + config.port)
});

new OthelloServer({ server });
