import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';

export default function ChatArea({ messages, onQuote }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onQuote={onQuote} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
