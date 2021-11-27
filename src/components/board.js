import config from '../config.js';
import Square from './square.js';

export default function Board(props) {
  const style = { width: (props.width * (config.squareWidth - 1)) + 'px' };
  const squares = props.squares.map((sq, i) =>
    <Square
      key={i}
      onClick={() => props.onClick(i)}
      status={sq}
     >
    </Square>
  );
  const className = props.enabled ? 'enabled' : 'disabled';
  return (
    <div id="board" className={className} style={ style }>
      {squares}
    </div>
  )
}
