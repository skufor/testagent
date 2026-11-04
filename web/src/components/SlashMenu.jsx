import React from 'react';
import { motion } from 'framer-motion';
import { Check } from '@phosphor-icons/react';

export default function SlashMenu({ items, highlight, onSelect, onHover }) {
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.14 }}
        className="absolute bottom-full left-0 mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-sm border border-border
          bg-bg-elevated shadow-[0_4px_16px_rgba(0,0,0,0.1)] py-2 z-20"
      >
        <p className="px-3 text-[12px] text-text-tertiary">Ничего не найдено</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.14 }}
      className="absolute bottom-full left-0 mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-sm border border-border
        bg-bg-elevated shadow-[0_4px_16px_rgba(0,0,0,0.1)] py-1 z-20 max-h-56 overflow-y-auto"
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        const isHighlighted = i === highlight;
        return (
          <button
            key={item.id}
            onMouseEnter={() => onHover(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(item)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors duration-100
              ${isHighlighted ? 'bg-bg-hover text-text-primary' : 'text-text-primary'}`}
          >
            <Icon size={14} className="text-text-secondary shrink-0" />
            <span className="flex-1 truncate">/{item.label}</span>
            {item.active && <Check size={12} className="text-accent shrink-0" />}
          </button>
        );
      })}
    </motion.div>
  );
}
