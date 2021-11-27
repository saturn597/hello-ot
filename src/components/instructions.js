import config from '../config.js';

import Winner from './winner.js';

const gameAbortedReasons = config.gameAbortedReasons;


export default function Instructions(props) {
  let instructions = 'Your move!';

  if (props.player !== props.turn) {
    instructions = 'Wait...';
  }

  if (props.gameAborted === gameAbortedReasons.opponentDisconnect) {
    instructions = 'Game over! Opponent disconnected.';
  }
  if (props.gameAborted === gameAbortedReasons.serverConnectionLost) {
    instructions = 'Game over! Lost server connection.';
  }
  if (props.gameAborted === gameAbortedReasons.opponentLeft) {
    instructions = 'Game over! Opponent left.';
  }

  if (props.os.gameOver) {
    instructions = <Winner score={props.os.getScore()} />;
  } else if (props.player === null) {
    instructions = "Playing offline";
  }

  return (
    <div>
      <strong>
        { instructions }
      </strong>
    </div>
  );
}


