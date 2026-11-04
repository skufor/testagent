import React, { useEffect, useRef, useState } from 'react';
import { List, PencilSimple, Bell } from '@phosphor-icons/react';
import PlanPill from './PlanPill.jsx';

function ChatTitle({ title, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title || '');
  const inputRef = useRef(null);

  useEffect(() => setDraft(title || ''), [title]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (!title) return <div className="hidden md:block w-8" />;

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim()) onRename(draft.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(title);
            setEditing(false);
          }
        }}
        autoFocus
        className="min-w-0 max-w-[40vw] px-2 py-1 rounded-sm border border-accent bg-bg text-[13.5px]
          text-text-primary outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Переименовать чат"
      className="group flex items-center gap-1.5 min-w-0 max-w-[40vw] px-2 py-1 rounded-sm
        hover:bg-bg-hover transition-colors duration-150 text-left"
    >
      <span className="truncate text-[13.5px] text-text-primary">{title}</span>
      <PencilSimple
        size={12}
        className="shrink-0 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      />
    </button>
  );
}

export default function TopBar({
  onMenuClick,
  chatTitle,
  onRenameChat,
  plan,
  onOpenPlans,
  hasUnseenUpdates,
  onOpenUpdates,
  backendOnline,
}) {
  return (
    <header className="relative flex items-center justify-between px-3 md:px-4 h-14 shrink-0 border-b border-border gap-2">
      <div className="flex items-center gap-1 min-w-0">
        <button
          className="md:hidden shrink-0 grid place-items-center w-8 h-8 rounded-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          onClick={onMenuClick}
          aria-label="Открыть меню"
          title="Меню"
        >
          <List size={19} />
        </button>
        <ChatTitle title={chatTitle} onRename={onRenameChat} />
        {backendOnline === false && (
          <span
            title="Сервер агента недоступен — проверь, что бэкенд запущен"
            className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-xs border border-danger/30 bg-danger-soft text-danger text-[10px]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            офлайн
          </span>
        )}
      </div>

      <div className="hidden sm:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <PlanPill plan={plan} onOpenPlans={onOpenPlans} />
      </div>

      <button
        onClick={onOpenUpdates}
        title="Что нового"
        className="relative shrink-0 grid place-items-center w-8 h-8 rounded-sm text-text-secondary
          hover:text-text-primary hover:bg-bg-hover transition-all duration-200 ease-out hover:scale-110"
      >
        <Bell size={17} />
        {hasUnseenUpdates && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
        )}
      </button>
    </header>
  );
}
