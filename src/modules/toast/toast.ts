// ==============================================================================
// IconHub Accessible Toast Notification System
// Non-blocking, accessible feedback for copy actions and errors.
// Prevents duplicate rapid notifications and respects reduced-motion.
// ==============================================================================

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  readonly id: string;
  readonly message: string;
  readonly type: ToastType;
  readonly createdAt: number;
}

type ToastListener = (toasts: readonly ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();
let lastToastMessage = '';
let lastToastTimestamp = 0;

function notify() {
  const immutable = [...toasts];
  listeners.forEach((listener) => listener(immutable));
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  listener([...toasts]);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): readonly ToastItem[] {
  return toasts;
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function showToast(
  message: string,
  type: ToastType = 'success',
  durationMs = 2800
): string | null {
  const now = Date.now();

  // Deduplicate identical messages shown within 1.5 seconds
  if (message === lastToastMessage && now - lastToastTimestamp < 1500) {
    return null;
  }

  lastToastMessage = message;
  lastToastTimestamp = now;

  const id = `toast-${now}-${Math.random().toString(36).slice(2, 7)}`;
  const item: ToastItem = {
    id,
    message,
    type,
    createdAt: now,
  };

  // Limit maximum simultaneous toasts to 3
  toasts = [...toasts.slice(-2), item];
  notify();

  if (durationMs > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, durationMs);
  }

  return id;
}

