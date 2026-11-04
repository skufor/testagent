import React from 'react';
import { X, User, CaretRight, Gear, SignOut } from '@phosphor-icons/react';

export default function AccountModal({
  open,
  onClose,
  user,
  onOpenAuth,
  onOpenSettings,
  onLogout,
  plan,
  onOpenPlans,
}) {
  if (!open) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
        <div
          className="w-full max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-sm bg-bg-elevated border border-border p-5 animate-popIn text-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-end mb-2">
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1" aria-label="Закрыть">
              <X size={18} />
            </button>
          </div>
          <span className="mx-auto grid place-items-center w-11 h-11 rounded-sm bg-bg border border-border text-text-secondary mb-3">
            <User size={20} />
          </span>
          <p className="text-[14px] text-text-primary mb-1">Ты не вошёл в аккаунт</p>
          <p className="text-[12.5px] text-text-secondary mb-4">
            Войди, чтобы сохранять историю чатов, скиллы и настройки
          </p>
          <button
            onClick={onOpenAuth}
            className="gradient-accent-hover w-full py-2.5 rounded-sm text-sm font-medium bg-accent text-accent-on transition-all"
          >
            Войти или зарегистрироваться
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className="w-full max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-sm bg-bg-elevated border border-border p-5 animate-popIn"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid place-items-center w-9 h-9 rounded-sm bg-bg border border-border text-text-secondary shrink-0">
              <User size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-medium text-text-primary truncate">{user.name}</h2>
              <p className="text-[12px] text-text-secondary truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1 shrink-0" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5">
          <button
            onClick={onOpenPlans}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm border border-border hover:bg-bg-hover transition-colors duration-150 text-left"
          >
            <span className="flex-1 text-[13.5px] text-text-primary">Тариф</span>
            <span className="text-[11px] px-2 py-0.5 rounded-xs bg-bg text-text-secondary border border-border">
              {plan}
            </span>
            <CaretRight size={13} className="text-text-tertiary" />
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm border border-border hover:bg-bg-hover transition-colors duration-150 text-left"
          >
            <Gear size={17} className="text-text-secondary shrink-0" />
            <span className="flex-1 text-[13.5px] text-text-primary">Настройки</span>
            <CaretRight size={13} className="text-text-tertiary" />
          </button>
        </div>

        <div className="my-4 border-t border-border" />

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-sm transition-colors duration-150"
        >
          <SignOut size={14} className="shrink-0" />
          Выйти
        </button>
      </div>
    </div>
  );
}
