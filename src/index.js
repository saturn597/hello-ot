import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

class Board extends React.Component {
  constructor(props) {
    super(props);
    const squares = Array(64).fill('empty');
    squares[27] =  'white';
    squares[28] = 'black';
    squares[35] = 'black';
    squares[36] = 'white';
    this.state = {
      squares,
    };
  }

  render() {
    const squares = this.state.squares.map((sq, i) =>
      <Square status={sq} key={i}></Square>
    );
    return <div id="board">{squares}</div>;
  }
}

function Square(props) {
  return (
    <button className="square">
      <div className={props.status}></div>
    </button>
  );
}

ReactDOM.render(
  <Board />,
  document.getElementById('root')
);
