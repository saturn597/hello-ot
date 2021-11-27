export default class OthelloState {
  // Represents a single state of an Othello game, including the status of the
  // board and all the pieces, the player whose turn it is, available captures,
  // move and the score.

  // Othello has two players, so players are represented by boolean values (in
  // general we consider true = black, false = white).

  // We'll model the board as an array of "squares", with each element being
  // either true, false, or null, depending on which player, if any, occupies
  // the cell.

  constructor(width, height) {
    this.width = width;
    this.height = height;

    this.gameOver = null;

    this.squares = [];
    this.currentPlayer = null;
  }

  static initialState(width, height) {
    // Get a conventional starting state - board with black and white diagonal
    // to each other at the center of the board

    const squares = Array(width * height).fill(null);

    const halfHeight = Math.floor(height / 2);
    const halfWidth = Math.floor(width / 2);
    const base = (halfHeight - 1) * width + halfWidth - 1;
    squares[base] = false;
    squares[base + 1] = true;
    squares[base + width] = true;
    squares[base + width + 1] = false;

    const state = new OthelloState(width, height);
    state.squares = squares;
    state.currentPlayer = true;
    state.gameOver = false;

    return state;
  }

  getAllCaptures(player, position) {
    // if the player (black/true or white/false) moves to this given position,
    // which squares should be captured?

    const squares = this.squares;
    function getCaptures(row) {
      // helper function to find the captures in a single row of adjacent
      // squares
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

    return getAllRows(position, this.width, this.height).flatMap(getCaptures);
  }

  getMoves(player) {
    // Get valid moves on a board described by squares for the given player.
    // A move is valid if at least 1 capture will result and the square is empty

    let moves = [];
    for (let i = 0; i < this.squares.length; i++) {
       if (this.squares[i] === null && this.getAllCaptures(player, i).length > 0) {
         moves.push(i);
      }
    }

    return moves;
  }

  getScore() {
    const squares = this.squares;

    let score = {};
    score[true] = squares.reduce(
      (acc, square) => square ? acc + 1 : acc, 0);
    score[false] = squares.reduce(
      (acc, square) => square === false ? acc + 1 : acc, 0);
    return score;
  }

  move(square) {
    // returns a new OthelloState, reflected by the current player moving to
    // the given square.

    const player = this.currentPlayer;
    const squares = this.squares.slice();

    const state = new OthelloState(this.width, this.height);
    state.squares = squares;
    state.gameOver = false;
    state.currentPlayer = player;

    const captures = this.getAllCaptures(player, square);
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

    const playerMoves = state.getMoves(player);
    const opponentMoves = state.getMoves(!player);

    if (opponentMoves.length > 0) {
       // Switch to the other player's turn if they have valid moves
       state.currentPlayer = !player;
    } else if (playerMoves.length === 0) {
      // If no one has valid moves, that's the end of the game
      state.gameOver = true;
    }
    return state;
  }
}


function getAllRows(square, width, height) {
  // We describe our Othello board as a flat array. We'll need to know the
  // indices into that array that correspond to "rows", or adjacent sequences
  // of squares running either up, down, left, right, or diagonally. This
  // function returns an array of 8 arrays, each subarray corresponding to
  // one of these rows. We'll assume our board has dimensions given by width
  // x height.

  const rows = [];

  function getRow(xStep, yStep) {
    // Helper function returning a single row at our square, with the
    // direction described by xStep and yStep. (An xStep of 1 and yStep of 0
    // will run from the starting square to the right, etc.)
    const row = [];

    // Translate our start position into x and y coordinates on the board and
    // take one step
    let currX = square % width + xStep;
    let currY = Math.floor(square / width) + yStep;

    // Now continue taking steps and adding to our "row"
    while (currX >= 0 && currX < width && currY >= 0 && currY < height) {
      row.push(currY * width + currX);
      currX += xStep;
      currY += yStep;
    }
    return row;
  }

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      if (x !== 0 || y !== 0) {
        rows.push(getRow(x, y));
      }
    }
  }

  return rows;
}
