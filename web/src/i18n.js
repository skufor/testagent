const dict = {
  ru: {
    tasks: 'Задачи',
    sources: 'Источники',
    restoreAnswer: 'Восстановить ответ',
    sitePreview: 'Превью сайта',
    hidePreview: 'Скрыть превью',
    copy: 'Копировать',
    copied: 'Скопировано',
    steps: 'Шаги',
    web: 'Веб',
    send: 'Отправить',
    stop: 'Остановить',
    newChat: 'Новый чат',
    settings: 'Настройки',
    language: 'Язык',
  },
  en: {
    tasks: 'Tasks',
    sources: 'Sources',
    restoreAnswer: 'Restore answer',
    sitePreview: 'Site preview',
    hidePreview: 'Hide preview',
    copy: 'Copy',
    copied: 'Copied',
    steps: 'Steps',
    web: 'Web',
    send: 'Send',
    stop: 'Stop',
    newChat: 'New chat',
    settings: 'Settings',
    language: 'Language',
  },
};

export function getLocale() {
  try {
    return localStorage.getItem('doggy-locale') || 'ru';
  } catch (_) {
    return 'ru';
  }
}

export function setLocale(code) {
  try {
    localStorage.setItem('doggy-locale', code);
  } catch (_) {}
  if (typeof document !== 'undefined') {
    document.documentElement.lang = code === 'en' ? 'en' : 'ru';
  }
}

export function t(key) {
  const loc = getLocale();
  return (dict[loc] && dict[loc][key]) || (dict.ru && dict.ru[key]) || key;
}

export const LOCALES = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
];
