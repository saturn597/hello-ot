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
  constructor(props) {
    super(props);

    const squares = Array(64).fill('empty');
    squares[27] =  'white';
    squares[28] = 'black';
    squares[35] = 'black';
    squares[36] = 'white';

    this.state = {
      squares,
      turn: 'white',
    };
  }

  handleClick(id) {
    let squares = this.state.squares.slice();
    let turn = this.state.turn;

    if (squares[id] !== 'empty') {
      return;
    }

    squares[id] = turn;
    if (turn === 'black') {
      turn = 'white';
    } else {
      turn = 'black';
    }

    this.setState({
      squares,
      turn,
    });
  }


  render() {
    return (
      <div id="main">
        <div id="gameStats">
          <Square status={this.state.turn} />
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
  return (
    <button className="square" onClick={props.onClick}>
      <div className={props.status}></div>
    </button>
  );
}

ReactDOM.render(
  <Game />,
  document.getElementById('root')
);
