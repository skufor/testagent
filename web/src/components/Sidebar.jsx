import React from 'react';
import { PawPrint, PencilSimpleLine, User, CaretDoubleLeft, X, Sun, Moon, Trash } from '@phosphor-icons/react';
import WorkspaceSwitcher from './WorkspaceSwitcher.jsx';

export default function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
  conversations,
  activeId,
  onSelect,
  onDeleteChat,
  onNewChat,
  onOpenAccount,
  userName,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  theme,
  onToggleTheme,
}) {
  return (
    <>
      {/* mobile scrim */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-[272px] ${collapsed ? 'md:w-16' : 'md:w-[272px]'} shrink-0 h-full
          bg-bg-sidebar border-r border-border
          flex flex-col
          transition-[transform,width] duration-300 ease-out
          ${open ? 'translate-x-0 animate-drawerIn' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* ---- collapsed rail (desktop only) ---- */}
        {collapsed && (
          <div className="hidden md:flex flex-col items-center h-full py-4">
            <button
              onClick={onToggleCollapsed}
              title="Развернуть панель (Ctrl+B)"
              className="grid place-items-center w-9 h-9 rounded-sm bg-text-primary text-bg
                transition-transform duration-200 ease-out hover:scale-110"
            >
              <PawPrint size={16} weight="fill" />
            </button>

            <button
              onClick={onNewChat}
              title="Новый чат (Ctrl+K)"
              className="mt-3 grid place-items-center w-9 h-9 rounded-sm border border-border
                text-text-secondary hover:text-text-primary hover:bg-bg-hover
                transition-all duration-200 ease-out hover:scale-110"
            >
              <PencilSimpleLine size={16} />
            </button>

            <div className="flex-1" />

            <button
              onClick={onToggleTheme}
              title="Тема (Ctrl+Shift+L)"
              className="mb-2 grid place-items-center w-9 h-9 rounded-sm border border-border
                text-text-secondary hover:text-text-primary hover:bg-bg-hover
                transition-all duration-300 ease-out hover:rotate-[25deg]"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              onClick={onOpenAccount}
              title={userName || 'Войти'}
              className="grid place-items-center w-9 h-9 rounded-sm border border-border
                text-text-secondary hover:text-text-primary hover:bg-bg-hover
                transition-all duration-200 ease-out hover:scale-110"
            >
              <User size={15} />
            </button>
          </div>
        )}

        {/* ---- expanded panel ---- */}
        <div className={`${collapsed ? 'md:hidden' : ''} flex flex-col h-full`}>
          {/* brand */}
          <div className="flex items-center justify-between px-4 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <span className="grid place-items-center w-7 h-7 rounded-sm bg-text-primary text-bg
                transition-transform duration-200 ease-out hover:scale-110">
                <PawPrint size={15} weight="fill" />
              </span>
              <span className="font-display text-[18px] text-text-primary tracking-tight">
                Doggy AI
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="hidden md:grid place-items-center text-text-tertiary hover:text-text-primary
                  hover:bg-bg-hover rounded-sm w-7 h-7 transition-all duration-200 ease-out hover:-translate-x-0.5"
                onClick={onToggleCollapsed}
                aria-label="Свернуть панель"
                title="Свернуть панель (Ctrl+B)"
              >
                <CaretDoubleLeft size={14} />
              </button>
              <button
                className="md:hidden text-text-secondary hover:text-text-primary p-1"
                onClick={onClose}
                aria-label="Закрыть панель"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={activeWorkspaceId}
            onSelect={onSelectWorkspace}
            onCreateClick={onCreateWorkspace}
          />

          {/* new chat */}
          <div className="px-3">
            <button
              onClick={onNewChat}
              title="Ctrl+K"
              className="group w-full flex items-center gap-2 px-3 py-2.5 rounded-sm
                border border-border bg-bg-elevated hover:bg-bg-hover
                text-sm text-text-primary transition-colors duration-150"
            >
              <PencilSimpleLine
                size={16}
                className="transition-transform duration-200 ease-out group-hover:scale-110"
              />
              Новый чат
            </button>
          </div>

          {/* history */}
          <div className="flex-1 overflow-y-auto px-3 mt-5 space-y-0.5">
            <p className="px-3 pb-1.5 text-[11px] text-text-tertiary">Недавние</p>
            {conversations.length === 0 && (
              <p className="px-3 py-2 text-[12.5px] text-text-tertiary">Пока пусто</p>
            )}
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`group relative flex items-center rounded-sm transition-all duration-150
                  ${c.id === activeId ? 'bg-accent-soft' : 'hover:bg-bg-hover'}`}
              >
                <button
                  onClick={() => onSelect(c.id)}
                  title={c.title}
                  className={`flex-1 min-w-0 text-left px-3 py-2 text-sm truncate
                    ${c.id === activeId ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}
                >
                  {c.title}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(c.id);
                  }}
                  title="Удалить чат"
                  className="shrink-0 mr-1.5 grid place-items-center w-6 h-6 rounded-xs text-text-tertiary
                    opacity-60 md:opacity-0 md:group-hover:opacity-100 hover:text-danger hover:bg-danger-soft transition-all duration-150"
                >
                  <Trash size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* footer: theme + account */}
          <div className="p-3 border-t border-border space-y-1.5">
            <button
              onClick={onToggleTheme}
              title="Ctrl+Shift+L"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm
                text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors duration-150 text-sm"
            >
              {theme === 'dark' ? <Sun size={15} className="shrink-0" /> : <Moon size={15} className="shrink-0" />}
              <span className="flex-1 text-left">{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
            </button>

            <button
              onClick={onOpenAccount}
              className="group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm
                border border-border bg-bg-elevated hover:bg-bg-hover transition-colors duration-150 text-sm"
            >
              <span className="grid place-items-center w-6 h-6 rounded-xs bg-bg text-text-secondary border border-border shrink-0
                transition-transform duration-200 ease-out group-hover:scale-110">
                <User size={13} />
              </span>
              <span className="flex-1 text-left text-text-primary truncate">{userName || 'Войти'}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
