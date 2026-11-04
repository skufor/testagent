import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const PHRASES = [
  'Задай любой вопрос',
  'Введи / для выбора навыков',
  'Подключите расширение, чтоб агент управлял браузером',
  'Агент умеет выполнять задачи шаг за шагом',
];

// Stands in for the native placeholder only on an empty, brand-new chat —
// cycles through a few hints every 5s. Pointer-events are disabled so it
// never gets in the way of clicking into the textarea underneath.
export default function RotatingPlaceholder({ active }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % PHRASES.length), 5000);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div className="absolute inset-x-4 top-[15px] h-[20px] overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="block text-[15px] text-text-tertiary truncate"
        >
          {PHRASES[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
