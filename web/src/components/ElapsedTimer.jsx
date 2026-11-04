import React, { useEffect, useState } from 'react';
import { Clock } from '@phosphor-icons/react';

function formatDuration(ms) {
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)} с`;
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ElapsedTimer({ startedAt, durationMs, running }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [running]);

  if (!startedAt) return null;
  const elapsed = running ? now - startedAt : durationMs ?? 0;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary mb-1.5">
      <Clock size={11} />
      {running ? `Работает ${formatDuration(elapsed)}` : `Заняло ${formatDuration(elapsed)}`}
    </span>
  );
}
