export default function PlayerChip(props) {
  return props.player ?
    <span className="blackChip">Black</span> :
    <span className="whiteChip">White</span>;
}


