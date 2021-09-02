import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';
import OthelloState from './othellostate.js';

const BOARDWIDTH = 8;
const BOARDHEIGHT = 8;

const loc = window.location;
const ws_port = 10001;
const ws_url = 'wss://' + loc.hostname + ':' + ws_port + loc.pathname;


const gameAbortedReasons = {
  opponentDisconnect: 'opponentDisconnect',
  opponentLeft: 'opponentLeft',
  serverConnectionLost: 'serverConnectionLost',
};


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: false,
      player: null,
      waiting: { true: 0, false: 0 },  // # games awaiting a given color
      ws: null,
    };

    this.endGame = this.endGame.bind(this);
    this.selectionMade = this.selectionMade.bind(this);
  }

  componentDidMount() {
    const ws = new WebSocket(ws_url);

    ws.onerror = e => {
      console.log(e);
    }

    ws.addEventListener('message', msg => {
      console.log('message: %s', msg.data);
      const parsed = JSON.parse(msg.data);
      if ('waiting' in parsed) {
        this.setState({ waiting: parsed.waiting });
      }
    });

    ws.addEventListener('close', e => {
      // TODO: try to reconnect
      console.log('websocket closed');
      this.setState({ ws: null });
    });

    this.setState({ ws });
  }

  endGame() {
    this.setState({
      selected: false,
      player: null,
    });
  }

  selectionMade(selection) {
    // Player selected the color they want to play as
    const ws = this.state.ws;
    if (selection !== null && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ joinAs: selection }));
    }
    this.setState({
      player: selection,
      selected: true,
    });
  }

  render() {
    const connected = this.state.ws !== null;

    if (!this.state.selected) {
      return (
        <div id="gameSelection">
          <GameSelection
            connected={connected}
            selectionMade={this.selectionMade}
            waiting={this.state.waiting}
          />
          <p>
            <a href="https://en.wikipedia.org/wiki/Reversi">
              How to play
            </a>
          </p>
          <p>
            Select "play as black" or "play as white" to play online as the
            given color. If no one else is waiting, you may have to wait for an
            opponent.  If you're not looking to play with someone else online,
            you can select "play offline" to play as both black and white from
            a single screen and have access to undo and redo buttons.
          </p>
        </div>
      );
    }
    return (
      <Game
        onEnd={this.endGame}
        player={this.state.player}
        ws={this.state.ws}
      />
    );
  }
}


class Game extends React.Component {
  // A React game of Othello.

  constructor(props) {
    super(props);

    const os = OthelloState.initialState(BOARDWIDTH, BOARDHEIGHT);
    this.state = {
      gameAborted: false,
      history: [os],
      historyIndex: 0,
      opponentConnected: false,
      os,
    };

    if (props.ws) {
      props.ws.addEventListener('close', e => {
        this.setState({
          gameAborted: gameAbortedReasons.serverConnectionLost,
        });
      });

      props.ws.addEventListener('message', msg => {
        const parsed = JSON.parse(msg.data);
        if ('move' in parsed) {
          // server is saying our opponent moved
          const square = parsed['move'];

          this.setState((state, props) => {
            return {
              os: state.os.move(square),
            };
          });
        }

        if ('opponentConnected' in parsed) {
          this.setState({ opponentConnected: parsed['opponentConnected'] });
        }

        if ('gameEnd' in parsed) {
          const reason = parsed['gameEnd'];
          this.setState({
            gameAborted: gameAbortedReasons[reason],
          });
        }
      });
    }

    this.advanceState = this.advanceState.bind(this);
    this.endGame = this.endGame.bind(this);
  }

  acceptingClicks() {
    // Determine whether our board should accept clicks

    const props = this.props;
    const state = this.state;

    // Accept clicks if props.player is unset, in which case we know we're
    // offline. Also accept clicks if we're playing online and it's our turn
    // and the game hasn't been aborted and our opponent is connected.
    const gameAborted = state.gameAborted;
    const gameOver = state.os.gameOver;
    const opponentConnected = state.opponentConnected;
    const ourTurn = state.os.currentPlayer === props.player;
    const playingOffline = props.player === null;

    return playingOffline ||
      (ourTurn && !gameAborted && !gameOver && opponentConnected);
  }

  advanceState(change) {
    this.setState((state, props) => {
      const historyIndex = state.historyIndex + change;
      const os = state.history[historyIndex];
      return { os, historyIndex };
    });
  }

  endGame() {
    const netplay = this.props.player !== null;
    const open = this.props.ws && this.props.ws.readyState === WebSocket.OPEN;

    if (netplay && open) {
      this.props.ws.send(JSON.stringify({ 'endGame': true }));
    }
    this.props.onEnd();
  }

  handleClick(square) {
    // mouse was clicked in a given square

    this.setState((state, props) => {
      if (!this.acceptingClicks()) {
        return null;
      }

      const os = state.os.move(square);
      if (os === null) {
        // OthelloState returns null on invalid move
        return null;
      }

      const historyIndex = state.historyIndex + 1;
      const history = state.history.slice(0, historyIndex);
      history.push(os);

      if (this.props.player !== null) {
        props.ws.send(JSON.stringify({ move: square }));
      }

      return { os, history, historyIndex };
    });
  }

  render() {
    const score = this.state.os.getScore();

    const online = this.props.player !== null;
    const allowUndo = this.state.historyIndex > 0;
    const allowRedo = this.state.historyIndex < this.state.history.length - 1;

    return (
      <div id="main">
        <Board
          enabled={this.acceptingClicks()}
          squares={this.state.os.squares}
          onClick={i => this.handleClick(i)}
        />
        <div id="hud">
          <ScoreDisplay score={score} />
          <TurnIndicator
            online={online}
            player={this.props.player}
            turn={this.state.os.currentPlayer}
          />
          {online &&
            <Instructions
              gameAborted={this.state.gameAborted}
              os={this.state.os}
              opponentConnected={this.state.opponentConnected}
              player={this.props.player}
              turn={this.state.os.currentPlayer}
            />
          }
          {!online &&
            <UndoRedo
              allowUndo={allowUndo}
              allowRedo={allowRedo}
              advanceState={this.advanceState}
            />
          }
          <button onClick={this.endGame}>End game</button>
        </div>

      </div>
    );
  }
}


function Board(props) {
  const squares = props.squares.map((sq, i) =>
    <Square
      key={i}
      onClick={() => props.onClick(i)}
      status={sq}
     >
    </Square>
  );
  const className = props.enabled ? 'enabled' : 'disabled';
  return <div id="board" className={className}>{squares}</div>;
}

function PlayerChip(props) {
  return props.player ?
    <span className="blackChip">Black</span> :
    <span className="whiteChip">White</span>;
}

function GameSelection(props) {
  const t = props.waiting[true];
  const f = props.waiting[false];
  return (
    <div>
      <button
        disabled={!props.connected}
        onClick={() => props.selectionMade(true)}
      >
        Play as black { '(' + t + ' waiting)' }
      </button>
      <button
        disabled={!props.connected}
        onClick={() => props.selectionMade(false)}
      >
        Play as white { '(' + f + ' waiting)' }
      </button>
      <button onClick={() => props.selectionMade(null)}>
        Play offline
      </button>
    </div>
  );
}

function ScoreDisplay(props) {
  return (
    <div id="scoreDisplay">
      <div className="scoreSection" id="blackScore">
        <span className="scoreLabel">Black</span>
        <div>
          { props.score[true] }
        </div>
      </div>
      <div className="scoreSection" id="whiteScore">
        <span className="scoreLabel">White</span>
        <div>
          { props.score[false] }
        </div>
      </div>
    </div>
  );
}

function Square(props) {
  let color = 'blank';
  if (props.status !== null) {
    color = props.status ? 'black' : 'white';
  }

  return (
    <button className="square" onClick={props.onClick}>
      <div className={color}></div>
    </button>
  );
}

function TurnIndicator(props) {

  const playingAs = <PlayerChip player={props.player} />;
  const turn = <PlayerChip player={props.turn} />;

  return (
    <div>
      <div className="turnSummary">
        {props.online && <div>You are playing as: {playingAs}</div>}
        <div>Next move: {turn}</div>
      </div>
    </div>
  );

}

function Instructions(props) {
  let instructions = 'Your move!';
  if (props.player !== props.turn) {
    instructions = 'Wait...';
  }
  if (!props.opponentConnected) {
    instructions = 'Waiting for opponent to join...';
  }

  if (props.gameAborted === gameAbortedReasons.opponentDisconnect) {
    instructions = 'Game over! Opponent disconnected.';
  }
  if (props.gameAborted === gameAbortedReasons.serverConnectionLost) {
    instructions = 'Game over! Lost server connection.';
  }
  if (props.gameAborted === gameAbortedReasons.opponentLeft) {
    instructions = 'Game over! Opponent left.';
  }

  if (props.os.gameOver) {
    instructions = <Winner score={props.os.getScore()} />;
  }

  return (
    <div>
      <strong>
        { instructions }
      </strong>
    </div>
  );
}

function UndoRedo(props) {
  return (
    <div>
      <button
        onClick={() => props.advanceState(-1)}
        disabled={!props.allowUndo}>
        Undo
      </button>
      <button
        onClick={() => props.advanceState(1)}
        disabled={!props.allowRedo}>
        Redo
      </button>
    </div>
  );
}

function Winner(props) {
  const score = props.score;

  let winnerText = 'It\'s a tie!';
  if (score[true] > score[false]) {
    winnerText = 'Black wins!';
  } else if (score[true] < score[false]) {
    winnerText = 'White wins!';
  }

  return <div id="winnerText">{winnerText}</div>;
}


ReactDOM.render(
  <App />,
  document.getElementById('root')
);
