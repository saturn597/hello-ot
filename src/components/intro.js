export default function Intro(props) {
  const connected = props.connected;
  const t = connected && props.waiting[true] > 0;
  const f = connected && props.waiting[false] > 0;

  return (
    <div id="intro">

      <h1>Othello</h1>

      <p>
        <a href="https://en.wikipedia.org/wiki/Reversi">
          About Reversi/Othello
        </a>
      </p>

      <div id="gameSelection">

        { connected ?
            <p>Which color would you like to play as? Pick an option below to
            play against an online opponent.</p>
          :
          <p><strong>No server connection!</strong></p>
        }
        <p>
          <button
            className={t ? 'gameAvailable' : 'noGames'}
            disabled={!connected}
            onClick={() => props.selectionMade(true)}
          >
            Black
          </button>
          <button
            className={f ? 'gameAvailable' : 'noGames'}
            disabled={!connected}
            onClick={() => props.selectionMade(false)}
          >
            White
          </button>
          <button
            disabled={!connected}
            className={t || f ? 'gameAvailable' : 'noGames'}
            onClick={() => props.selectionMade(false, true)}
          >
            No preference
          </button>
        </p>

        <p>
          Click below if you don't want to play against someone else online.
        </p>
        <p>
          <button
            onClick={() => props.selectionMade(null)}
            className="noGames"
          >
            Play both sides
          </button>
        </p>

        <p>
          <strong>Tip:</strong> Buttons appear green if a potential opponent is
          already waiting.
        </p>

      </div>

    </div>
  );
}
