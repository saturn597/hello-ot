import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

class Board extends React.Component {
  render() {
    let squares = Array(64).fill(null).map((_, i) => 
      <div key={i} className="square"></div>);
    return <div id="board">{squares}</div>;
  }
}

ReactDOM.render(
  <Board />,
  document.getElementById('root')
);
