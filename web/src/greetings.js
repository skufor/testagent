// A mix of static, time-aware and name-aware greetings. One is picked at
// random each time the empty-chat screen mounts (new chat / fresh session).

function getDaypart() {
  const hour = new Date().getHours();
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'day';
  return 'evening';
}

const DAYPART_GREETINGS = {
  morning: ['Доброе утро! Что разбираем сегодня?', 'С добрым утром — с чего начнём?'],
  day: ['Добрый день! Чем помочь?', 'Как продвигается день? Спрашивай что угодно'],
  evening: ['Добрый вечер! Что нужно разобрать?', 'Вечер — отличное время доразобраться с задачей'],
  night: ['Не спится? Доggy на месте', 'Поздняя сессия — спрашивай, помогу'],
};

const NAME_GREETINGS = [
  (name) => `Привет, ${name}! О чём подумаем?`,
  (name) => `${name}, с чего начнём сегодня?`,
  (name) => `Рад видеть, ${name}. Что разбираем?`,
];

const GENERIC_GREETINGS = [
  'Спроси Doggy о чём угодно',
  'Готов помочь — с чего начнём?',
  'Какой вопрос сегодня?',
  'Разберём что угодно — от домашки до идей',
];

export function pickGreeting(userName) {
  const pool = [];

  DAYPART_GREETINGS[getDaypart()].forEach((g) => pool.push(g));
  if (userName) {
    const firstName = userName.split(' ')[0];
    NAME_GREETINGS.forEach((fn) => pool.push(fn(firstName)));
  }
  GENERIC_GREETINGS.forEach((g) => pool.push(g));

  return pool[Math.floor(Math.random() * pool.length)];
}
