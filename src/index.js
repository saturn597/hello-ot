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

    const online = this.props.player !== null;
    const allowUndo = this.state.historyIndex > 0;
    const allowRedo = this.state.historyIndex < this.state.history.length - 1;

    return (
      <div id="main">
        <Board
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
          {!online &&
            <UndoRedo
              allowUndo={allowUndo}
              allowRedo={allowRedo}
              advanceState={this.advanceState}
            />
          }
          {this.state.os.gameOver && <Winner score={score} />}
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
  return <div id="board">{squares}</div>;
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
      {props.online &&
        <strong>
          { props.player === props.turn ?
            'Your move!' :
            'Wait...'
          }
        </strong>
      }
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
