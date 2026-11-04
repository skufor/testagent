import React, { useEffect, useRef, useState } from 'react';
import { X, TelegramLogo, Envelope, LockKey, CircleNotch, ArrowSquareOut } from '@phosphor-icons/react';

const TABS = [
  { id: 'login', label: 'Вход' },
  { id: 'register', label: 'Регистрация' },
];

const POLL_INTERVAL_MS = 2000;

export default function AuthModal({ open, onClose, onAuth }) {
  const [tab, setTab] = useState('login');

  // idle -> starting -> waiting -> (confirmed closes) | error
  const [tgState, setTgState] = useState('idle');
  const [tgLink, setTgLink] = useState('');
  const [tgError, setTgError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  if (!open) return null;

  const handleClose = () => {
    clearInterval(pollRef.current);
    setTgState('idle');
    setTgError('');
    onClose();
  };

  const startTelegram = async () => {
    setTgState('error');
    setTgError('Вход через Telegram к этому агенту не подключён');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-sm bg-bg-elevated border border-border p-5 animate-popIn"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-display text-[19px] text-text-primary">Doggy AI</h2>
          <button onClick={handleClose} className="text-text-tertiary hover:text-text-primary p-1" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        {/* Telegram — the real, working login path */}
        <div className="rounded-sm border border-accent bg-accent-soft p-3.5 mb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <TelegramLogo size={17} className="text-accent shrink-0" />
            <p className="text-[13.5px] font-medium text-text-primary">Telegram не подключён</p>
          </div>

          {tgState === 'waiting' ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                <CircleNotch size={12} className="animate-spin shrink-0" />
                Ждём подтверждения в Telegram…
              </p>
              <a
                href={tgLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-sm border border-border
                  bg-bg-elevated text-[12.5px] text-text-primary hover:bg-bg-hover transition-colors duration-150"
              >
                Открыть в Telegram
                <ArrowSquareOut size={13} />
              </a>
            </div>
          ) : (
            <>
              <button
                onClick={startTelegram}
                disabled={tgState === 'starting'}
                className="gradient-accent-hover w-full flex items-center justify-center gap-2 py-2.5 rounded-sm
                  text-sm font-medium bg-accent text-accent-on transition-all disabled:opacity-60"
              >
                {tgState === 'starting' ? (
                  <CircleNotch size={15} className="animate-spin" />
                ) : (
                  <TelegramLogo size={16} />
                )}
                Войти через Telegram
              </button>
              {tgError && <p className="mt-2 text-[12px] text-danger">{tgError}</p>}
            </>
          )}
        </div>

        {/* email + password — no account system on the backend yet */}
        <div className="opacity-50 pointer-events-none select-none">
          <div className="flex items-center gap-1 bg-bg rounded-sm p-1 border border-border mb-3">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 px-3 py-1.5 rounded-xs text-xs font-medium
                  ${tab === id ? 'bg-bg-elevated border border-border text-text-primary' : 'text-text-secondary'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            <div className="relative">
              <Envelope size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                readOnly
                placeholder="Почта"
                className="w-full pl-9 pr-3 py-2 rounded-sm border border-border bg-bg text-[14px]
                  text-text-primary placeholder:text-text-tertiary outline-none"
              />
            </div>
            <div className="relative">
              <LockKey size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                readOnly
                placeholder="Пароль"
                className="w-full pl-9 pr-3 py-2 rounded-sm border border-border bg-bg text-[14px]
                  text-text-primary placeholder:text-text-tertiary outline-none"
              />
            </div>
            <button className="w-full py-2.5 rounded-sm text-sm font-medium border border-border text-text-primary">
              {tab === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-text-tertiary">Вход по почте — скоро</p>
      </div>
    </div>
  );
}
