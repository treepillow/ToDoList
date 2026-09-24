export interface UndoToast {
  key: string;
  message: string;
  onUndo: () => void;
}

interface Props {
  undos: UndoToast[];
  saveError: boolean;
  onDismissError: () => void;
}

export function Toasts({ undos, saveError, onDismissError }: Props) {
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
      {undos.map((toast) => (
        <div key={toast.key} className="toast" role="status">
          <span>{toast.message}</span>
          <button type="button" className="toast-action" onClick={toast.onUndo}>
            Undo
          </button>
        </div>
      ))}
    </div>
  );
}
