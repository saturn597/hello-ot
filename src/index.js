import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';
import config from './config.js';

import AwaitOpponent from './components/awaitOpponent.js';
import Game from './components/game.js';
import Intro from './components/intro.js';

const loc = window.location;
const prefix = loc.protocol === 'https:' ? 'wss' : 'ws';
const ws_port = config.port || loc.port;
const wsUrl = prefix + '://' + loc.hostname + ':' + ws_port + loc.pathname;

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      connected: false,
      gameStarted: false,
      selected: false,
      player: null,
      waiting: { true: 0, false: 0 },  // # of games awaiting a given color
      ws: null,
    };

    this.endGame = this.endGame.bind(this);
    this.selectionMade = this.selectionMade.bind(this);

    this.socketClosed = this.socketClosed.bind(this);
    this.socketMessage = this.socketMessage.bind(this);
    this.socketOpen = this.socketOpen.bind(this);
  }

  componentDidMount() {
    this.connectSocket();

    this.keepAlive = setInterval(() => {
      if (this.state.ws && this.state.ws.readyState === WebSocket.OPEN) {
        this.state.ws.send(JSON.stringify({ keepAlive: true }));
      }
    }, config.keepAliveDelay);
  }

  componentWillUnmount() {
    if (this.state.ws) {
      this.state.ws.removeEventListener('close', this.socketClosed);
      this.state.ws.removeEventListener('message', this.socketMessage);
      this.state.ws.removeEventListener('open', this.socketOpen);
      this.state.ws.close();
    }

    if (this.keepAlive) {
      clearInterval(this.keepAlive);
    }
  }

  connectSocket() {
    const ws = new WebSocket(wsUrl);

    ws.addEventListener('close', this.socketClosed);
    ws.addEventListener('error', e => console.log(e));
    ws.addEventListener('message', this.socketMessage);
    ws.addEventListener('open', this.socketOpen);

    this.setState({ ws });
  }

  endGame() {
    const netplay = this.state.player !== null;
    const open = this.state.ws && this.state.ws.readyState === WebSocket.OPEN;

    if (netplay && open) {
      this.state.ws.send(JSON.stringify({ 'endGame': true }));
    }

    this.setState({
      gameStarted: false,
      player: null,
      selected: false,
    });
  }

  selectionMade(selection, any) {
    // Player selected the color they want to play as (or told us they don't
    // have a preference if any === true). Null for selection means they want
    // to play offline, so don't send anything to server in that case.
    const ws = this.state.ws;

    if (selection !== null && ws && ws.readyState === WebSocket.OPEN) {
      // To server, join as null means they don't have a color preference
      const selectionToSend = any ? null : selection;
      ws.send(JSON.stringify({ joinAs: selectionToSend }));
    }

    this.setState({
      gameStarted: selection === null,
      player: selection,
      selected: true,
    });
  }

  socketClosed() {
    console.log('websocket closed');
    this.state.ws.removeEventListener('close', this.socketClosed);
    this.state.ws.removeEventListener('message', this.socketMessage);
    this.state.ws.removeEventListener('open', this.socketOpen);


    this.setState((state, props) => {
      return {
        connected: false,
        selected: state.gameStarted, // unselect if game hasn't started
      };
    });

    setTimeout(this.connectSocket.bind(this), config.reconnectDelay);
  }

  socketMessage(msg) {
    console.log('message: %s', msg.data);
    const parsed = JSON.parse(msg.data);
    if ('waiting' in parsed) {
      this.setState({ waiting: parsed.waiting });
    }

    if ('opponentConnected' in parsed) {
      if (parsed.opponentConnected === true) {
        this.setState({ gameStarted: true });
      }
    }

    if ('color' in parsed) {
      this.setState({ player: parsed.color });
    }
  }

  socketOpen() {
    this.setState({ connected: true });
  }

  render() {
    const pregame = this.state.selected ?

      <AwaitOpponent onEnd={this.endGame} /> :

      <Intro
        connected={this.state.connected}
        selectionMade={this.selectionMade}
        waiting={this.state.waiting}
        ws={this.state.ws}
      />;

    return (
      <div>
        {this.props.devMode && <WsSender ws={this.state.ws} />}
        {!this.state.gameStarted ?
          pregame :
          <Game
            width={config.boardWidth}
            height={config.boardHeight}
            onEnd={this.endGame}
            player={this.state.player}
            ws={this.state.player === null ? null : this.state.ws}
          />
        }
      </div>
    );
  }
}


class WsSender extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: '' };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(e) {
    this.setState({ value: e.target.value });
  }

  handleSubmit(e) {
    this.props.ws.send(this.state.value);
    e.preventDefault();
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <input
          type="text"
          onChange={this.handleChange}
          value={this.state.value}
        />
        <input type="submit" value="Send" />
      </form>
    );
  }
}

ReactDOM.render(
  <App devMode={config.devMode} />,
  document.getElementById('root')
);
