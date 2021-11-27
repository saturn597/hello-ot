export default function UndoRedo(props) {
  return (
    <div>
      <button
        onClick={() => props.advanceState(-1)}
        disabled={!props.allowUndo}>
        Undo
      </button>
      <button
        onClick={() => props.advanceState(1)}
        disabled={!props.allowRedo}>
        Redo
      </button>
    </div>
  );
}


