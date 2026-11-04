import { useEffect, useRef } from 'react';

// Attach to the element that should stay open when clicked, and close when
// the user clicks anywhere else (or presses Escape). Used by every modal and
// popover so "click outside to close" behaves consistently across the app.
export default function useOutsideClose(active, onClose) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return;

    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, onClose]);

  return ref;
}
