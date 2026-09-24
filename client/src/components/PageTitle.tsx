import { useEffect, useRef, useState } from 'react';

interface Props {
  name: string;
  onRename: (name: string) => void;
  /** Focus and select the title (used right after creating a list). */
  autoFocus?: boolean;
}

/** Notion-style page title: always editable; Enter/blur saves, Escape cancels. */
export function PageTitle({ name, onRename, autoFocus }: Props) {
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);

  useEffect(() => setDraft(name), [name]);

  useEffect(() => {
    if (!autoFocus) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [autoFocus]);

  const save = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setDraft(name);
  };

  return (
    <h1 className="page-title">
      <input
        ref={inputRef}
        className="page-title-input"
        aria-label="List name"
        value={draft}
        maxLength={100}
        placeholder="Untitled"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            cancelled.current = true;
            setDraft(name);
            e.currentTarget.blur();
          }
        }}
      />
    </h1>
  );
}
