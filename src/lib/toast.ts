import { useEffect, useState, useCallback } from 'react';
import type { ToastMessage } from '@/types';

let toastIdCounter = 0;
type ToastListener = (toasts: ToastMessage[]) => void;
const listeners = new Set<ToastListener>();
let currentToasts: ToastMessage[] = [];

export function showToast(type: ToastMessage['type'], message: string): void {
  if (
    currentToasts.some(
      (t) => t.type === type && t.message === message,
    )
  ) {
    return;
  }
  const id = `toast-${++toastIdCounter}`;
  currentToasts = [...currentToasts, { id, type, message }];
  listeners.forEach((l) => l(currentToasts));

  setTimeout(() => {
    currentToasts = currentToasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l(currentToasts));
  }, 4000);
}

export function useToasts(): [ToastMessage[], (id: string) => void] {
  const [toasts, setToasts] = useState<ToastMessage[]>(currentToasts);

  useEffect(() => {
    const listener: ToastListener = (updated) => setToasts([...updated]);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    currentToasts = currentToasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l(currentToasts));
  }, []);

  return [toasts, dismiss];
}
