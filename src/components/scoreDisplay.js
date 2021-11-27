export default function ScoreDisplay(props) {
  return (
    <div id="scoreDisplay">
      <div className="scoreSection" id="blackScore">
        <span className="scoreLabel">Black</span>
        <div>
          { props.score[true] }
        </div>
      </div>
      <div className="scoreSection" id="whiteScore">
        <span className="scoreLabel">White</span>
        <div>
          { props.score[false] }
        </div>
      </div>
    </div>
  );
}


