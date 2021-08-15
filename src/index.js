import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';
import OthelloState from './othellostate.js';

const BOARDWIDTH = 8;
const BOARDHEIGHT = 8;

const loc = window.location;
const ws_port = 10001;
const ws_url = 'wss://' + loc.hostname + ':' + ws_port + loc.pathname;


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: false,
      player: null,
      waiting: { true: 0, false: 0 },  // # games awaiting a given color
      ws: null,
    };
  }

  componentDidMount() {
    const ws = new WebSocket(ws_url);

    ws.onerror = e => {
      console.log(e);
    }
    ws.onclose = e => {
      console.log(e);
    }

    ws.addEventListener('message', msg => {
      console.log('message: %s', msg.data);
      const parsed = JSON.parse(msg.data);
      if ('waiting' in parsed) {
        this.setState({ waiting: parsed.waiting });
      }
    });

    this.selectionMade = this.selectionMade.bind(this);

    this.setState({ ws });
  }

  selectionMade(selection) {
    // Player selected the color they want to play as
    const ws = this.state.ws;
    if (selection !== null && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ joinAs: selection }));
    }
    this.setState({
      player: selection,
      selected: true,
    });
  }

  render() {
    if (!this.state.selected) {
      return (
        <GameSelection
          selectionMade={this.selectionMade}
          waiting={this.state.waiting}
        />
      );
    }
    return <Game ws={this.state.ws} player={this.state.player}/>;
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
  return <div id="board">{squares}</div>;
}


class Game extends React.Component {
  // A React game of Othello.

  constructor(props) {
    super(props);

    const os = OthelloState.initialState(BOARDWIDTH, BOARDHEIGHT);
    this.state = {
      os,
      history: [os],
      historyIndex: 0,
    };

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
    });

    this.advanceState = this.advanceState.bind(this);
  }

  advanceState(change) {
    this.setState((state, props) => {
      const historyIndex = state.historyIndex + change;
      const os = state.history[historyIndex];
      return { os, historyIndex };
    });
  }

  handleClick(square) {
    // mouse was clicked in a given square

    this.setState((state, props) => {
      if (!state.os.currentPlayer === props.player && props.player !== null) {
        // only allow move if it's our turn
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

      props.ws.send(JSON.stringify({ move: square }));

      return { os, history, historyIndex };
    });
  }

  render() {
    const score = this.state.os.getScore();

    // description of who has won - default to non-breaking space
    let winnerText = '\u00A0';

    if (this.state.os.gameOver === true) {
      if (score[true] > score[false]) {
        winnerText = 'Black wins!';
      } else if (score[true] < score[false]) {
        winnerText = 'White wins!';
      } else {
        winnerText = 'It\'s a tie!';
      }
    }

    const offline = this.props.player === null;
    const allowUndo = this.state.historyIndex > 0;
    const allowRedo = this.state.historyIndex < this.state.history.length - 1;
    return (
      <div id="main">
        <div id="gameStats">
          <Square status={this.state.os.currentPlayer} />
          <div>{ winnerText }</div>
          Black: {score[true]} |
          White: {score[false]}
        </div>
        <Board
          squares={this.state.os.squares}
          onClick={i => this.handleClick(i)}
        />
        {offline &&
            <UndoRedo
              allowUndo={allowUndo}
              allowRedo={allowRedo}
              advanceState={this.advanceState}
            />
        }
      </div>
    );
  }
}

function GameSelection(props) {
  const t = props.waiting[true];
  const f = props.waiting[false];
  return (
    <div>
      <button onClick={() => props.selectionMade(true)}>
        Play as black { t > 0 ? '(' + t + ')' : '' }
      </button>
      <button onClick={() => props.selectionMade(false)}>
        Play as white { f > 0 ? '(' + f + ')' : ''}
      </button>
      <button onClick={() => props.selectionMade(null)}>
        Play offline
      </button>
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


ReactDOM.render(
  <App />,
  document.getElementById('root')
);
