// Add a new entry to the TOP of this array whenever you ship something
// worth telling users about. The newest entry's `id` is compared against
// what the person has already seen (stored in localStorage) to decide
// whether to show the "unread" dot on the bell icon.
export const CHANGELOG = [
  {
    id: '2026-11-study-agent',
    date: '2026-11-04',
    title: 'Чат смотрит в учебники',
    body: 'Ответы идут из study-agent: библиотека txt/md/pdf/docx, цитаты, граф понятий, экспорт в DOCX и PDF. Режим Agent выполняет один блок Python в песочнице. Картинки, веб-поиск и вход через Telegram у этого агента отсутствуют.',
  },
  {
    id: '2026-01-app-icon',
    date: '2026-01-15',
    title: 'Новая иконка Doggy AI',
    body: 'У приложения появилась собственная иконка для вкладки браузера и домашнего экрана.',
  },
  {
    id: '2026-01-workspaces-harness',
    date: '2026-01-10',
    title: 'Пространства и Harness',
    body: 'Добавили рабочие пространства для группировки чатов и раздел Harness: скиллы, библиотека и коннекторы (Obsidian, Telegram) — всё в Настройках.',
  },
  {
    id: '2026-01-launch',
    date: '2026-01-01',
    title: 'Doggy AI запущен',
    body: 'Режимы Research и Agent, вложения с превью, генерация изображений и многое другое.',
  },
];

export const LATEST_UPDATE_ID = CHANGELOG[0].id;
