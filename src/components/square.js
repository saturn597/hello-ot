import config from '../config.js';


export default function Square(props) {
  const style = {
    width: config.squareWidth + 'px',
    height: config.squareHeight + 'px',
  };

  let color = 'blank';
  if (props.status !== null) {
    color = props.status ? 'black' : 'white';
  }

  return (
    <button className="square" onClick={props.onClick} style={style}>
      <div className={color}></div>
    </button>
  );
}


