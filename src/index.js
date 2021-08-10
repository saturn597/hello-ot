import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

const BOARDWIDTH = 8;
const BOARDHEIGHT = 8;

const STATES = {
  'active': 0,
  'complete': 1,
};

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
    ws.onerror = err => {
      console.log(err);
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

  selectionMade(player) {
    // Player selected the color they want to play as
    const ws = this.state.ws;
    if (player !== null && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ joinAs: player }));
    }
    this.setState({
      player,
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
  // A game of Othello.

  // Othello has two players, so players are represented by boolean values (in
  // general we consider true = black, false = white).

  // We'll model the board as an array of "squares", with each element being
  // either true, false, or null, depending on which player, if any, occupies
  // the cell.

  constructor(props) {
    super(props);

    props.ws.addEventListener('message', msg => {
      const parsed = JSON.parse(msg.data);
      if ('move' in parsed && 'player' in parsed) {
        const square = parsed['move'];
        const player = parsed['player'];
        this.setState((state, props) => {
          if (player === state.player) {
            return;
          }

          return {
            squares: move(player, square, state.squares),
          };
        });
      }
    });

    this.state = {
      gameState: STATES.active,
      squares: initialSquares(BOARDWIDTH, BOARDHEIGHT),
      turn: true,
    };
  }

  handleClick(squareClicked) {
    this.setState((state, props) => {
      let gameState = state.gameState;

      let turn = state.turn;
      if (!turn === props.player && props.player !== null) {
        // only allow click if it's our turn
        return {};
      }

      const squares = move(state.turn, squareClicked, state.squares);
      if (squares === null) {
        return;
      }

      const playerCaptures = getMoves(squares, turn);
      const opponentCaptures = getMoves(squares, !turn);

      if (opponentCaptures.length > 0) {
         // Switch to the other player's turn if they have valid moves
         turn = !turn;
      } else if (playerCaptures.length === 0) {
        // If no one has valid moves, that's the end of the game
        gameState = STATES.complete;
      }

      props.ws.send(JSON.stringify({ move: squareClicked }));

      return {
        gameState,
        squares,
        turn,
      };
    });
  }


  render() {
    const score = calcScore(this.state.squares);

    let leaderDesc = '\u00A0';
    if (this.state.gameState === STATES.complete) {
      if (score[true] > score[false]) {
        leaderDesc = 'Black wins!';
      } else if (score[true] < score[false]) {
        leaderDesc = 'White wins!';
      } else {
        leaderDesc = 'It\'s a tie!';
      }
    }
    leaderDesc = <div>{leaderDesc}</div>;

    return (
      <div id="main">
        <div id="gameStats">
          <Square status={this.state.turn} />
          { leaderDesc }
          Black: {score[true]} |
          White: {score[false]}
        </div>
        <Board
          squares={this.state.squares}
          onClick={i => this.handleClick(i)}
        />
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


function calcScore(squares) {
    let score = {};
    score[true] = squares.reduce(
      (acc, square) => square ? acc + 1 : acc, 0);
    score[false] = squares.reduce(
      (acc, square) => square === false ? acc + 1 : acc, 0);
    return score;
}

function getAllCaptures(player, position, squares) {
    // If the given "player" (either true, false, or null) places a piece at
    // "position" in the array of "squares", return the element numbers in
    // "squares" that should now be captured.

    const captures = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        if (x !== 0 || y !== 0) {
          captures.push(...getCaptures(getRow(position, x, y), squares, player));
        }
      }
    }
    return captures;
}

function getCaptures(row, squares, player) {
  // A capture happens if there's a straight line between a newly-placed piece
  // and another piece of the same color, and each square in that line is
  // occupied by the opposite color. In that case, the cells occupied by the
  // opposing player are "turned over" and now belong to the player who made
  // the move.

  // This function checks for potential captures in a given set of squares. The
  // set of squares to check is given by "row". "Row" is an array of indices
  // into the array "squares". These are the squares to check. We're checking
  // if the squares are capturable by "player", which is a boolean value
  // telling us if it's black's or white's turn.

  // If "row" starts with a consecutive series of squares controlled by the
  // opposite player, and that series is followed by a square controlled by
  // "player", then the series of squares controlled by the opposite player is
  // considered a potential capture.

  // Returns an array of squares (represented as indices into "squares") that
  // can be captured if the player places a piece at the head of the row.

  let curr = 0;
  let captures = [];
  while (curr < row.length && squares[row[curr]] === !player) {
    captures.push(row[curr]);
    curr++;
  }

  if (squares[row[curr]] !== player) {
    captures = [];
  }

  return captures;
}

function getRow(start, xStep, yStep) {
  // Our Othello board is described by a flat array of true/false/null values.
  // In order to find which cells on the board have been captured after a turn,
  // we need to determine which elements in the array correspond to vertical,
  // horizontal and diagonal rows relative to a newly placed piece.

  // Given a "start" position in an 8x8 matrix, this function returns a row
  // whose direction is described by "xStep" and "yStep" (not including the
  // start position). For example, if xStep is 0 and yStep is -1, this will
  // return the element numbers for cells in the row going straight down the
  // board from the given starting position. If yStep is +1, the row will go
  // straight down the board from the starting position. Etc.
  const row = [];

  // Translate our start position into x and y coordinates on the board and
  // take one step
  let currX = start % BOARDWIDTH + xStep;
  let currY = Math.floor(start / BOARDWIDTH) + yStep;

  // Now continue taking steps and adding to our "row"
  while (currX >= 0 && currX < BOARDWIDTH && currY >= 0 && currY < BOARDHEIGHT) {
    row.push(currY * BOARDWIDTH + currX);
    currX += xStep;
    currY += yStep;
  }
  return row;
}

function getMoves(squares, player) {
  // Get valid moves on a board described by squares for the given player.
  // A move is valid if at least 1 capture will result and the square is empty

  let moves = [];
  for (let i = 0; i < squares.length; i++) {
     if (squares[i] === null && getAllCaptures(player, i, squares).length > 0) {
       moves.push(i);
    }
  }

  return moves;
}

function initialSquares(width, height) {
    const squares = Array(width * height).fill(null);

    // Conventional starting state for the board - black and white diagonal to
    // each other at the center of the board
    const halfHeight = Math.floor(height / 2);
    const halfWidth = Math.floor(width / 2);
    const base = (halfHeight - 1) * width + halfWidth - 1;
    squares[base] = false;
    squares[base + 1] = true;
    squares[base + width] = true;
    squares[base + width + 1] = false;

    return squares;
}

function move(player, square, squares) {
  squares = squares.slice();

  const captures = getAllCaptures(player, square, squares);

  if (squares[square] !== null || captures.length === 0) {
    // must be in an unoccupied square and switch some of the opponent's
    // pieces, or the move is invalid
    return null;
  }

  // claim clicked square for the current player
  squares[square] = player;

  // Change the captured squares to the appropriate color
  for (let c of captures) {
    squares[c] = player;
  }

  return squares;
}




ReactDOM.render(
  <App />,
  document.getElementById('root')
);
