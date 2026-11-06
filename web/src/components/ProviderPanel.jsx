import React, { useEffect, useState } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { fetchProvider, saveProvider } from '../api/agentClient.js';

export default function ProviderPanel() {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProvider()
      .then((data) => {
        if (cancelled) return;
        setBaseUrl(data.base_url || '');
        setModel(data.model || '');
        setHasKey(Boolean(data.has_api_key));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const data = await saveProvider({
        base_url: baseUrl.trim(),
        api_key: apiKey.trim(),
        model: model.trim(),
      });
      setHasKey(Boolean(data.has_api_key));
      setApiKey('');
      setMessage('Сохранено на сервере');
    } catch (err) {
      setMessage(err.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-text-secondary">
        <CircleNotch size={14} className="animate-spin" /> Загрузка…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-text-secondary leading-relaxed">
        OpenAI-совместимый endpoint. Ключ хранится только на VPS в файле вне git. Пустой base URL —
        снова используется системный шлюз из .env.
      </p>
      <label className="block space-y-1">
        <span className="text-[11px] text-text-tertiary">Base URL</span>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.example.com/v1"
          className="w-full px-3 py-2 rounded-sm border border-border bg-bg text-[13.5px] text-text-primary outline-none focus:border-accent"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] text-text-tertiary">
          API key {hasKey ? '(уже задан — введи новый, чтобы заменить)' : ''}
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={hasKey ? '••••••••' : 'sk-…'}
          className="w-full px-3 py-2 rounded-sm border border-border bg-bg text-[13.5px] text-text-primary outline-none focus:border-accent"
          autoComplete="off"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] text-text-tertiary">Модель по умолчанию</span>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="gpt-4.1-mini"
          className="w-full px-3 py-2 rounded-sm border border-border bg-bg text-[13.5px] text-text-primary outline-none focus:border-accent"
        />
      </label>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="w-full py-2 rounded-sm bg-accent text-accent-on text-[13px] font-medium hover:bg-accent-hover disabled:opacity-60"
      >
        {saving ? 'Сохраняю…' : 'Сохранить провайдера'}
      </button>
      {message && <p className="text-[12px] text-text-secondary">{message}</p>}
    </div>
  );
}
