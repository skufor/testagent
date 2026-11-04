import React, { useState } from 'react';
import { X, User, SlidersHorizontal } from '@phosphor-icons/react';
import ProfilePanel from './ProfilePanel.jsx';
import HarnessPanel from './HarnessPanel.jsx';

const SECTIONS = [
  { id: 'profile', label: 'Профиль', icon: User },
  { id: 'harness', label: 'Harness', icon: SlidersHorizontal },
];

export default function SettingsModal({
  open,
  onClose,
  user,
  onSaveProfile,
  telegramLinked,
  onOpenTelegram,
  onDeleteAccount,
  skills,
  onUploadSkill,
  onRenameSkill,
  onEditSkill,
  onDeleteSkill,
  books,
  onUploadBook,
  onDeleteBook,
  connectors,
  onToggleConnector,
}) {
  const [section, setSection] = useState('profile');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[calc(100vw-2rem)] sm:max-w-lg rounded-sm bg-bg-elevated border border-border p-5 animate-popIn"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-display text-[19px] text-text-primary">Настройки</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary p-1" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-bg rounded-sm p-1 border border-border w-fit max-w-full overflow-x-auto mb-4">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-medium transition-colors duration-150
                  ${active ? 'bg-bg-elevated border border-border text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Icon size={14} className={active ? 'text-accent' : ''} />
                {label}
              </button>
            );
          })}
        </div>

        {section === 'profile' ? (
          <ProfilePanel
            user={user}
            onSaveProfile={onSaveProfile}
            telegramLinked={telegramLinked}
            onOpenTelegram={onOpenTelegram}
            onDeleteAccount={onDeleteAccount}
          />
        ) : (
          <HarnessPanel
            skills={skills}
            onUploadSkill={onUploadSkill}
            onRenameSkill={onRenameSkill}
            onEditSkill={onEditSkill}
            onDeleteSkill={onDeleteSkill}
            books={books}
            onUploadBook={onUploadBook}
            onDeleteBook={onDeleteBook}
            connectors={connectors}
            onToggleConnector={onToggleConnector}
          />
        )}
      </div>
    </div>
  );
}
