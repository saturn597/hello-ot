import PlayerChip from './playerChip.js';


export default function TurnIndicator(props) {

  const playingAs = <PlayerChip player={props.player} />;
  const turn = <PlayerChip player={props.turn} />;

  return (
    <div>
      <div className="turnSummary">
        {props.online && <div>You are playing as: {playingAs}</div>}
        <div>Next move: {turn}</div>
      </div>
    </div>
  );

}


