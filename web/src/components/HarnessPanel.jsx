import React, { useRef, useState } from 'react';
import {
  UploadSimple,
  PencilSimple,
  NotePencil,
  Trash,
  BookOpen,
  PuzzlePiece,
  Plugs,
  CheckCircle,
  Hammer,
} from '@phosphor-icons/react';
import { CONNECTOR_META } from '../connectorItems.js';

const TABS = [
  { id: 'skills', label: 'Скиллы', icon: PuzzlePiece },
  { id: 'library', label: 'Библиотека', icon: BookOpen },
  { id: 'connectors', label: 'Коннекторы', icon: Plugs },
];

function SkillRow({ skill, onRename, onEdit, onDelete }) {
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameDraft, setNameDraft] = useState(skill.name);
  const [descDraft, setDescDraft] = useState(skill.description || '');

  const saveName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed) onRename(skill.id, trimmed);
    else setNameDraft(skill.name);
    setEditingName(false);
  };
  const saveDesc = () => {
    onEdit(skill.id, descDraft.trim());
    setEditingDesc(false);
  };

  return (
    <div className="rounded-sm border border-border bg-bg p-3">
      <div className="flex items-center gap-1.5">
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            onBlur={saveName}
            className="flex-1 px-2 py-1 rounded-xs border border-accent bg-bg-elevated
              text-[13.5px] text-text-primary outline-none"
          />
        ) : (
          <p className="flex-1 text-[13.5px] font-medium text-text-primary truncate">{skill.name}</p>
        )}

        <button
          onClick={() => setEditingName(true)}
          title="Переименовать"
          className="grid place-items-center w-7 h-7 rounded-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors duration-150"
        >
          <PencilSimple size={13} />
        </button>
        <button
          onClick={() => setEditingDesc((v) => !v)}
          title="Редактировать описание"
          className="grid place-items-center w-7 h-7 rounded-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors duration-150"
        >
          <NotePencil size={13} />
        </button>
        <button
          onClick={() => onDelete(skill.id)}
          title="Удалить"
          className="grid place-items-center w-7 h-7 rounded-xs text-text-tertiary hover:text-danger hover:bg-danger-soft transition-colors duration-150"
        >
          <Trash size={13} />
        </button>
      </div>

      {editingDesc ? (
        <div className="mt-2">
          <textarea
            autoFocus
            rows={2}
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            placeholder="Что делает этот скилл…"
            className="w-full px-2 py-1.5 rounded-xs border border-accent bg-bg-elevated
              text-[12.5px] text-text-primary placeholder:text-text-tertiary outline-none resize-none"
          />
          <button
            onClick={saveDesc}
            className="mt-1.5 px-2.5 py-1 rounded-xs bg-accent text-accent-on text-[11px] font-medium"
          >
            Сохранить
          </button>
        </div>
      ) : (
        skill.description && <p className="mt-1.5 text-[12px] text-text-secondary">{skill.description}</p>
      )}
    </div>
  );
}

export default function HarnessPanel({
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
  const [tab, setTab] = useState('skills');
  const skillInputRef = useRef(null);
  const bookInputRef = useRef(null);

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-sm border border-border bg-bg mb-3">
        <Hammer size={14} className="text-text-tertiary shrink-0" />
        <p className="text-[11.5px] text-text-secondary leading-snug">
          Скилл — доп. инструкция к вопросу. Библиотека индексируется в агенте. Коннекторы не подключены.
        </p>
      </div>

      <div className="flex items-center gap-1 bg-bg rounded-sm p-1 border border-border w-fit max-w-full overflow-x-auto mb-4">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs font-medium transition-colors duration-150
                ${active ? 'bg-bg-elevated border border-border text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Icon size={14} className={active ? 'text-accent' : ''} />
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'skills' ? (
        <div>
          <input
            ref={skillInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onUploadSkill(e.target.files[0]);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => skillInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-sm
              border border-dashed border-border text-[13px] text-text-secondary
              hover:text-text-primary hover:border-text-tertiary transition-colors duration-150 mb-3"
          >
            <UploadSimple size={15} />
            Загрузить скилл
          </button>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {skills.length === 0 && (
              <p className="text-[12.5px] text-text-tertiary text-center py-4">
                Пока нет загруженных скиллов
              </p>
            )}
            {skills.map((s) => (
              <SkillRow
                key={s.id}
                skill={s}
                onRename={onRenameSkill}
                onEdit={onEditSkill}
                onDelete={onDeleteSkill}
              />
            ))}
          </div>
        </div>
      ) : tab === 'library' ? (
        <div>
          <input
            ref={bookInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onUploadBook(e.target.files[0]);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => bookInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-sm
              border border-dashed border-border text-[13px] text-text-secondary
              hover:text-text-primary hover:border-text-tertiary transition-colors duration-150 mb-3"
          >
            <UploadSimple size={15} />
            Добавить учебник (txt, md, pdf, docx)
          </button>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {books.length === 0 && (
              <p className="text-[12.5px] text-text-tertiary text-center py-4">
                База знаний пока пуста
              </p>
            )}
            {books.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm border border-border bg-bg"
              >
                <span className="grid place-items-center w-8 h-8 rounded-sm bg-bg-elevated border border-border text-text-secondary shrink-0">
                  <BookOpen size={15} />
                </span>
                <span className="flex-1 text-[13px] text-text-primary truncate">{b.title}</span>
                <button
                  onClick={() => onDeleteBook(b.id)}
                  title="Удалить"
                  className="grid place-items-center w-7 h-7 rounded-xs text-text-tertiary hover:text-danger hover:bg-danger-soft transition-colors duration-150"
                >
                  <Trash size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {connectors.map((c) => {
            const meta = CONNECTOR_META[c.id];
            const Icon = meta.icon;
            return (
              <div
                key={c.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm border border-border bg-bg"
              >
                <span className="grid place-items-center w-8 h-8 rounded-sm bg-bg-elevated border border-border text-text-secondary shrink-0">
                  <Icon size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] text-text-primary">{meta.name}</p>
                  {c.connected && (
                    <p className="flex items-center gap-1 text-[11px] text-text-secondary mt-0.5">
                      <CheckCircle size={11} weight="fill" />
                      Подключено
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onToggleConnector(c.id)}
                  className={`px-3 py-1.5 rounded-sm text-[12px] font-medium transition-colors duration-150
                    ${
                      c.connected
                        ? 'border border-border text-text-secondary hover:text-danger hover:bg-danger-soft'
                        : 'bg-accent text-accent-on hover:bg-accent-hover'
                    }`}
                >
                  {c.connected ? 'Отключить' : 'Подключить'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
