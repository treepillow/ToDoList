interface Props {
  undoMessage: string | null;
  onUndo: () => void;
  saveError: boolean;
  onDismissError: () => void;
}

export function Toasts({ undoMessage, onUndo, saveError, onDismissError }: Props) {
  return (
    <div className="toast-region">
      {saveError && (
        <div className="toast" role="alert">
          <span>Couldn’t save your changes. The list has been refreshed.</span>
          <button type="button" className="toast-action" onClick={onDismissError}>
            Dismiss
          </button>
        </div>
      )}
      {undoMessage && (
        <div className="toast" role="status">
          <span>{undoMessage}</span>
          <button type="button" className="toast-action" onClick={onUndo}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
