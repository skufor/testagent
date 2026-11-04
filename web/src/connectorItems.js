import { Notebook, TelegramLogo } from '@phosphor-icons/react';

export const CONNECTOR_META = {
  obsidian: { name: 'Obsidian', icon: Notebook },
  telegram: { name: 'Telegram', icon: TelegramLogo },
};

// Mock browsable content per connector, used when picking something to
// attach as context via the "+" menu. Purely client-side / illustrative.
export const CONNECTOR_ITEMS = {
  obsidian: ['Заметки о дрессировке', 'Дневник прогулок', 'Идеи для контента'],
  telegram: ['Чат с ветклиникой', 'Канал «Собаки Москвы»', 'Переписка с грумером'],
};

export function iconForConnector(source) {
  return CONNECTOR_META[source]?.icon;
}
