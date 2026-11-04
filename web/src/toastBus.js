// Deliberately tiny: a single-listener pub/sub so any component can fire a
// toast (`showToast('Скопировано')`) without prop-drilling through the
// whole tree. <ToastHost/> is the one subscriber, mounted once in App.
let listener = null;

export function showToast(message) {
  listener?.(message);
}

export function subscribeToast(fn) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}
