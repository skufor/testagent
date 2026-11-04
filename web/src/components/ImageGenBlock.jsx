import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleNotch, DownloadSimple } from '@phosphor-icons/react';
import ImageGenCanvas from './ImageGenCanvas.jsx';

export default function ImageGenBlock({ imageGen }) {
  const isGenerating = imageGen.status === 'generating';

  return (
    <div className="relative w-full max-w-[380px] aspect-[4/3] rounded-sm border border-border
      overflow-hidden bg-bg mb-3">
      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div
            key="canvas"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <ImageGenCanvas className="w-full h-full" />
            <div className="imagegen-grain pointer-events-none" />
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[11px]
              text-text-secondary bg-bg-elevated/85 backdrop-blur-sm px-2 py-1 rounded-xs border border-border">
              <CircleNotch size={11} className="animate-spin" />
              Doggy рисует…
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="image"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 group"
          >
            <img src={imageGen.url} alt="Сгенерированное изображение" className="w-full h-full object-cover" />
            <a
              href={imageGen.url}
              download="doggy-generated.png"
              className="absolute bottom-2 right-2 grid place-items-center w-7 h-7 rounded-sm
                bg-bg-elevated/90 backdrop-blur-sm border border-border text-text-secondary
                opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-accent"
              aria-label="Скачать изображение"
              title="Скачать"
            >
              <DownloadSimple size={14} />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
