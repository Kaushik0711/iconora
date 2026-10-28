'use client';

import { useEffect, type RefObject } from 'react';

export interface UseSearchKeyboardShortcutOptions {
  inputRef?: RefObject<HTMLInputElement | null>;
  onEscape?: () => void;
  enabled?: boolean;
}

export function handleSearchShortcutKey(
  e: KeyboardEvent,
  options: UseSearchKeyboardShortcutOptions = {}
): boolean {
  const { inputRef, onEscape } = options;
  const target = e.target as HTMLElement | null;
  const isEditable =
    target &&
    (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
      Boolean(target.isContentEditable));

  // Escape handling
  if (e.key === 'Escape') {
    if (onEscape) {
      e.preventDefault();
      onEscape();
      return true;
    }
    const currentInput = inputRef?.current;
    const isInputActive =
      currentInput &&
      typeof document !== 'undefined' &&
      (document.activeElement === currentInput || target === currentInput);

    if (currentInput && isInputActive) {
      e.preventDefault();
      if (currentInput.value) {
        currentInput.value = '';
        currentInput.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        currentInput.blur();
      }
      return true;
    }
    return false;
  }

  // Shortcut keys: '/' (when not in editable element) or Ctrl+K / Cmd+K
  const isSlash = !isEditable && e.key === '/';
  const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';

  if (isSlash || isCmdK) {
    e.preventDefault();
    const input =
      inputRef?.current ||
      (typeof document !== 'undefined'
        ? (document.querySelector('input[type="search"]') as HTMLInputElement | null) ||
          (document.querySelector('input[data-search-input]') as HTMLInputElement | null)
        : null);

    if (input) {
      input.focus();
      if (typeof input.select === 'function') {
        input.select();
      }
      return true;
    }
  }

  return false;
}

export function attachSearchKeyboardShortcut(
  options: UseSearchKeyboardShortcutOptions = {},
  targetWindow?: Window | { addEventListener: (type: string, listener: (e: KeyboardEvent) => void) => void; removeEventListener: (type: string, listener: (e: KeyboardEvent) => void) => void }
): () => void {
  const win = targetWindow ?? (typeof window !== 'undefined' ? window : undefined);
  if (!win) return () => {};

  const handleKeyDown = (e: KeyboardEvent) => {
    handleSearchShortcutKey(e, options);
  };

  win.addEventListener('keydown', handleKeyDown);
  return () => win.removeEventListener('keydown', handleKeyDown);
}

export function useSearchKeyboardShortcut({
  inputRef,
  onEscape,
  enabled = true,
}: UseSearchKeyboardShortcutOptions = {}) {
  useEffect(() => {
    if (!enabled) return;
    return attachSearchKeyboardShortcut({ inputRef, onEscape, enabled });
  }, [inputRef, onEscape, enabled]);
}
