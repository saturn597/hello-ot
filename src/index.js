import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

const BOARDWIDTH = 8;
const BOARDHEIGHT = 8;

const STATES = {
  'active': 0,
  'complete': 1,
};

class Board extends React.Component {
  render() {
    const squares = this.props.squares.map((sq, i) =>
      <Square
        key={i}
        onClick={() => this.props.onClick(i)}
        status={sq}
       >
      </Square>
    );
    return <div id="board">{squares}</div>;
  }
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

    const squares = Array(BOARDWIDTH * BOARDHEIGHT).fill(null);

    // Conventional starting state for the board - black and white diagonal to
    // each other at the center of the board
    const halfHeight = Math.floor(BOARDHEIGHT / 2);
    const halfWidth = Math.floor(BOARDWIDTH / 2);
    const base = (halfHeight - 1) * BOARDWIDTH + halfWidth - 1;
    squares[base] = false;
    squares[base + 1] = true;
    squares[base + BOARDWIDTH] = true;
    squares[base + BOARDWIDTH + 1] = false;

    this.state = {
      gameState: STATES.active,
      score: calcScore(squares),
      squares,
      turn: true,
    };
  }

  handleClick(id) {
    let squares = this.state.squares.slice();
    let turn = this.state.turn;

    if (squares[id] !== null) {
      return;
    }

    // claim clicked square for the current player
    squares[id] = turn;

    const captures = getAllCaptures(id, squares, turn);

    // Move is only valid if it results in captures
    if (captures.length === 0) {
      return;
    }

    // Change the captured squares to the appropriate color
    for (let c of captures) {
      squares[c] = turn;
    }

    let gameState = this.state.gameState;

    const playerCaptures = getMoves(squares, turn);
    const opponentCaptures = getMoves(squares, !turn);

    if (opponentCaptures.length > 0) {
       // Switch to the other player's turn if they have valid moves
       turn = !turn;
    } else if (playerCaptures.length === 0) {
      // If no one has valid moves, that's the end of the game
      gameState = STATES.complete;
    }

    this.setState({
      gameState,
      score: calcScore(squares),
      squares,
      turn,
    });
  }


  render() {
    let leaderDesc = '\u00A0';
    if (this.state.gameState === STATES.complete) {
      if (this.state.score[true] > this.state.score[false]) {
        leaderDesc = 'Black wins!';
      } else if (this.state.score[true] < this.state.score[false]) {
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
          Black: {this.state.score[true]} |
          White: {this.state.score[false]}
        </div>
        <Board
          squares={this.state.squares}
          onClick={i => this.handleClick(i)}
        />
      </div>
    );
  }
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

function getAllCaptures(position, squares, player) {
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
  const moves = [];

  for (let i = 0; i < squares.length; i++) {
    const numCaptures = getAllCaptures(i, squares, player).length;
    if (numCaptures > 0 && squares[i] === null) {
      // A move is valid if at least 1 capture will result and the square is
      // empty
      moves.push(i);
    }
  }

  return moves;
}


ReactDOM.render(
  <Game />,
  document.getElementById('root')
);
