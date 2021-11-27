export default function Winner(props) {
  const score = props.score;

  let winnerText = 'It\'s a tie!';
  if (score[true] > score[false]) {
    winnerText = 'Black wins!';
  } else if (score[true] < score[false]) {
    winnerText = 'White wins!';
  }

  return <div id="winnerText">{winnerText}</div>;
}
