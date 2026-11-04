import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle } from '@phosphor-icons/react';
import { subscribeToast } from '../toastBus.js';

export default function ToastHost() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return subscribeToast((message) => {
      clearTimeout(timerRef.current);
      setToast(message);
      timerRef.current = setTimeout(() => setToast(null), 1800);
    });
  }, []);

  return createPortal(
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-sm bg-text-primary text-bg
              text-[13px] shadow-[0_6px_20px_rgba(0,0,0,0.18)]"
          >
            <CheckCircle size={15} weight="fill" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
