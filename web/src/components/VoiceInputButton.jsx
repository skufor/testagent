import React, { useRef, useState } from 'react';
import { Microphone } from '@phosphor-icons/react';

export default function VoiceInputButton({ onTranscript, locked, onLockedClick, lockedReason }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognitionImpl =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  if (!SpeechRecognitionImpl) return null; // no fake button for unsupported browsers

  const stop = () => {
    recognitionRef.current?.stop();
  };

  const start = () => {
    const recognition = new SpeechRecognitionImpl();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim();
      if (text) onTranscript(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const handleClick = () => {
    if (locked) {
      onLockedClick?.();
      return;
    }
    if (listening) stop();
    else start();
  };

  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleClick}
      title={locked ? lockedReason : listening ? 'Остановить запись' : 'Голосовой ввод'}
      className={`grid place-items-center w-8 h-8 rounded-sm transition-all duration-200 ease-out
        ${locked ? 'text-text-tertiary opacity-50 hover:opacity-80' : ''}
        ${listening ? 'text-danger bg-danger-soft' : !locked ? 'text-text-tertiary hover:text-text-primary hover:bg-bg-hover' : ''}`}
      aria-label="Голосовой ввод"
    >
      <Microphone size={17} weight={listening ? 'fill' : 'regular'} className={listening ? 'animate-pulse' : ''} />
    </button>
  );
}
