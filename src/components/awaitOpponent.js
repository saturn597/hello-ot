export default function AwaitOpponent(props) {
  return (
    <div>
      Waiting for opponent to join...
      <button onClick={props.onEnd}>Cancel</button>
    </div>
  );
}


