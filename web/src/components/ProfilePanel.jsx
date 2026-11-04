import React, { useState } from 'react';
import { TelegramLogo, CheckCircle, CaretRight, Trash } from '@phosphor-icons/react';

export default function ProfilePanel({
  user,
  onSaveProfile,
  telegramLinked,
  onOpenTelegram,
  onDeleteAccount,
}) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const dirty = name.trim() !== user?.name || email.trim() !== user?.email;

  const handleSave = () => {
    if (!name.trim() || !email.trim()) return;
    onSaveProfile({ name: name.trim(), email: email.trim() });
  };

  return (
    <div>
      <label className="block text-[12px] text-text-secondary mb-1.5">Имя</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 rounded-sm border border-border bg-bg text-[14px]
          text-text-primary outline-none focus:border-accent transition-colors mb-3"
      />

      <label className="block text-[12px] text-text-secondary mb-1.5">Почта</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-3 py-2 rounded-sm border border-border bg-bg text-[14px]
          text-text-primary outline-none focus:border-accent transition-colors"
      />

      <button
        onClick={handleSave}
        disabled={!dirty || !name.trim() || !email.trim()}
        className="gradient-accent-hover mt-3 w-full py-2 rounded-sm text-[13px] font-medium
          bg-accent text-accent-on disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        Сохранить изменения
      </button>

      <div className="my-4 border-t border-border" />

      <button
        onClick={onOpenTelegram}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm border border-border hover:bg-bg-hover transition-colors duration-150 text-left"
      >
        <TelegramLogo size={17} className="text-text-secondary shrink-0" />
        <span className="flex-1 text-[13.5px] text-text-primary">Telegram</span>
        {telegramLinked ? (
          <span className="flex items-center gap-1 text-[11px] text-text-secondary">
            <CheckCircle size={13} weight="fill" />
            привязан
          </span>
        ) : (
          <CaretRight size={13} className="text-text-tertiary" />
        )}
      </button>

      <div className="my-4 border-t border-border" />

      {confirmingDelete ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-danger-soft">
          <span className="flex-1 text-[12px] text-danger">Удалить аккаунт без возможности восстановления?</span>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="text-[11px] text-text-secondary hover:text-text-primary px-2 py-1"
          >
            Отмена
          </button>
          <button
            onClick={onDeleteAccount}
            className="text-[11px] font-medium text-white bg-danger px-2 py-1 rounded-xs hover:opacity-90 transition-opacity"
          >
            Удалить
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingDelete(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-danger hover:bg-danger-soft rounded-sm transition-colors duration-150"
        >
          <Trash size={14} className="shrink-0" />
          Удалить аккаунт
        </button>
      )}
    </div>
  );
}
