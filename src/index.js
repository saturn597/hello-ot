import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

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

    const squares = Array(64).fill(null);

    // Conventional starting state for the board:
    squares[27] = false;
    squares[28] = true;
    squares[35] = true;
    squares[36] = false;

    this.state = {
      score: {true: 0, false: 0},
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

    let score = Object.assign({}, this.state.score);

    const captures = getAllCaptures(id, squares, turn);

    // Move is only valid if it results in captures
    if (captures.length === 0) {
      return;
    }

    // Change the captured squares to the appropriate color
    for (let c of captures) {
      squares[c] = turn;
    }

    score[turn] += captures.length;

    turn = !turn;
    this.setState({
      score,
      squares,
      turn,
    });
  }


  render() {
    return (
      <div id="main">
        <div id="gameStats">
          <Square status={this.state.turn} />
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
  // oppositve player, and that series is followed by a square controlled by
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
  // start position).For example, if xStep is 0 and yStep is -1, this will
  // return the element numbers for cells in the row going straight down the
  // board from the given starting position. If yStep is +1, the row will go
  // straight down the board from the starting position. Etc.

  const row = [];

  let curr = start;
  let currX;
  let currY;

  while (true) {
    currX = curr % 8;
    currY = Math.floor(curr / 8);
    currX += xStep;
    currY += yStep;
    if (currX < 0 || currX > 7 || currY < 0 || currY > 7) {
      break;
    }
    curr = currY * 8 + currX;
    row.push(curr);
  }
  return row;
}



ReactDOM.render(
  <Game />,
  document.getElementById('root')
);
