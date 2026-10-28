// ==============================================================================
// IconHub Phase 8 Verification Suite: Real UX Behavior
// Tests actual production implementations of:
// 1. Keyboard shortcuts ('/', Ctrl+K, Cmd+K, Escape, editable element boundaries, focus restoration)
// 2. Theme persistence, system preference synchronization, explicit overrides, and storage fallback
// 3. Toast notification lifecycle, cooldown deduplication, and bounds
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getStoredTheme,
  setStoredTheme,
  resolveTheme,
  applyTheme,
  getSystemTheme,
  watchSystemTheme,
  resetThemeMemory,
  THEME_STORAGE_KEY,
  THEME_CHANGE_EVENT,
} from '../src/modules/theme/index.ts';

import {
  handleSearchShortcutKey,
  attachSearchKeyboardShortcut,
} from '../src/modules/keyboard/index.ts';

import {
  showToast,
  dismissToast,
  getToasts,
  subscribeToasts,
} from '../src/modules/toast/toast.ts';

// ==============================================================================
// Helpers & DOM Mocks
// ==============================================================================

function createMockStorage(canAccess = true) {
  const store = new Map();
  return {
    getItem(k) {
      if (!canAccess) throw new Error('SecurityError: localStorage is disabled');
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      if (!canAccess) throw new Error('SecurityError: localStorage is disabled');
      store.set(k, String(v));
    },
    removeItem(k) {
      if (!canAccess) throw new Error('SecurityError: localStorage is disabled');
      store.delete(k);
    },
    clear() {
      store.clear();
    },
  };
}

function createMockDocument(initialDataTheme = 'system') {
  const classes = new Set();
  const attributes = new Map([['data-theme', initialDataTheme]]);
  return {
    documentElement: {
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
      },
      setAttribute(k, v) {
        attributes.set(k, String(v));
      },
      getAttribute(k) {
        return attributes.get(k) || null;
      },
    },
    activeElement: null,
    querySelector() {
      return null;
    },
    _classes: classes,
    _attributes: attributes,
  };
}

function createMockMatchMedia(initialDark = false) {
  let isDark = initialDark;
  const listeners = new Set();

  return {
    query: '(prefers-color-scheme: dark)',
    get matches() {
      return isDark;
    },
    setMatches(value) {
      isDark = value;
      listeners.forEach((cb) => cb({ matches: isDark }));
    },
    addEventListener(event, cb) {
      if (event === 'change') listeners.add(cb);
    },
    removeEventListener(event, cb) {
      if (event === 'change') listeners.delete(cb);
    },
    addListener(cb) {
      listeners.add(cb);
    },
    removeListener(cb) {
      listeners.delete(cb);
    },
  };
}

function createKeyEvent(key, { ctrlKey = false, metaKey = false, target } = {}) {
  let defaultPrevented = false;
  return {
    key,
    ctrlKey,
    metaKey,
    target: target || { tagName: 'BODY', isContentEditable: false },
    preventDefault() {
      defaultPrevented = true;
    },
    get defaultPrevented() {
      return defaultPrevented;
    },
  };
}

function createMockInputElement(initialValue = '') {
  let focused = false;
  let selected = false;
  const events = [];

  return {
    tagName: 'INPUT',
    type: 'search',
    value: initialValue,
    isContentEditable: false,
    focus() {
      focused = true;
    },
    blur() {
      focused = false;
    },
    select() {
      selected = true;
    },
    dispatchEvent(e) {
      events.push(e);
      return true;
    },
    get isFocused() {
      return focused;
    },
    get isSelected() {
      return selected;
    },
    get dispatchedEvents() {
      return events;
    },
  };
}

// ==============================================================================
// 1. Keyboard Shortcuts: Real Behavior Tests
// ==============================================================================

test('Keyboard: "/" focuses search outside editable elements', () => {
  const input = createMockInputElement('');
  const inputRef = { current: input };

  // Pressing '/' on <body>
  const bodyEvent = createKeyEvent('/', { target: { tagName: 'BODY', isContentEditable: false } });
  const handledBody = handleSearchShortcutKey(bodyEvent, { inputRef });
  assert.equal(handledBody, true, 'Must handle "/" on body');
  assert.equal(bodyEvent.defaultPrevented, true, 'Must prevent default for "/" outside input');
  assert.equal(input.isFocused, true, 'Must focus search input');
  assert.equal(input.isSelected, true, 'Must select search input text');

  // Pressing '/' on <div>
  const divEvent = createKeyEvent('/', { target: { tagName: 'DIV', isContentEditable: false } });
  const handledDiv = handleSearchShortcutKey(divEvent, { inputRef });
  assert.equal(handledDiv, true);
  assert.equal(divEvent.defaultPrevented, true);

  // Pressing '/' on <button>
  const btnEvent = createKeyEvent('/', { target: { tagName: 'BUTTON', isContentEditable: false } });
  const handledBtn = handleSearchShortcutKey(btnEvent, { inputRef });
  assert.equal(handledBtn, true);
  assert.equal(btnEvent.defaultPrevented, true);
});

test('Keyboard: "/" does not steal input from inputs, textareas, selects, or contenteditable elements', () => {
  const input = createMockInputElement('');
  const inputRef = { current: input };

  // 1. Inside an <input>
  const inputEvent = createKeyEvent('/', { target: { tagName: 'INPUT', isContentEditable: false } });
  const handledInput = handleSearchShortcutKey(inputEvent, { inputRef });
  assert.equal(handledInput, false, 'Must NOT handle "/" inside input');
  assert.equal(inputEvent.defaultPrevented, false, 'Must NOT prevent default inside input');

  // 2. Inside a <textarea>
  const textareaEvent = createKeyEvent('/', { target: { tagName: 'TEXTAREA', isContentEditable: false } });
  const handledTextarea = handleSearchShortcutKey(textareaEvent, { inputRef });
  assert.equal(handledTextarea, false, 'Must NOT handle "/" inside textarea');
  assert.equal(textareaEvent.defaultPrevented, false, 'Must NOT prevent default inside textarea');

  // 3. Inside a <select>
  const selectEvent = createKeyEvent('/', { target: { tagName: 'SELECT', isContentEditable: false } });
  const handledSelect = handleSearchShortcutKey(selectEvent, { inputRef });
  assert.equal(handledSelect, false, 'Must NOT handle "/" inside select');
  assert.equal(selectEvent.defaultPrevented, false, 'Must NOT prevent default inside select');

  // 4. Inside a contenteditable element
  const editableEvent = createKeyEvent('/', { target: { tagName: 'DIV', isContentEditable: true } });
  const handledEditable = handleSearchShortcutKey(editableEvent, { inputRef });
  assert.equal(handledEditable, false, 'Must NOT handle "/" inside contenteditable element');
  assert.equal(editableEvent.defaultPrevented, false, 'Must NOT prevent default inside contenteditable');
});

test('Keyboard: attachSearchKeyboardShortcut registers and unregisters window event listener', () => {
  const listeners = new Set();
  const mockWin = {
    addEventListener(type, fn) {
      if (type === 'keydown') listeners.add(fn);
    },
    removeEventListener(type, fn) {
      if (type === 'keydown') listeners.delete(fn);
    },
  };

  const input = createMockInputElement('');
  const inputRef = { current: input };

  const cleanup = attachSearchKeyboardShortcut({ inputRef }, mockWin);
  assert.equal(listeners.size, 1, 'Must register keydown listener');

  // Trigger listener through mock window
  const listener = Array.from(listeners)[0];
  const event = createKeyEvent('/', { target: { tagName: 'BODY', isContentEditable: false } });
  listener(event);
  assert.equal(input.isFocused, true, 'Triggered listener must focus input');

  // Cleanup
  cleanup();
  assert.equal(listeners.size, 0, 'Cleanup must unregister keydown listener');
});

test('Keyboard: Ctrl+K and Cmd+K focus search input and prevent default', () => {
  const input = createMockInputElement('active query');
  const inputRef = { current: input };

  // Cmd+K (macOS)
  const cmdKEvent = createKeyEvent('k', { metaKey: true, target: { tagName: 'BODY', isContentEditable: false } });
  const handledCmdK = handleSearchShortcutKey(cmdKEvent, { inputRef });
  assert.equal(handledCmdK, true, 'Must handle Cmd+K');
  assert.equal(cmdKEvent.defaultPrevented, true, 'Must prevent default for Cmd+K');
  assert.equal(input.isFocused, true);
  assert.equal(input.isSelected, true);

  // Ctrl+K (Windows/Linux) - even if focused in another element
  const ctrlKEvent = createKeyEvent('k', { ctrlKey: true, target: { tagName: 'INPUT', isContentEditable: false } });
  const handledCtrlK = handleSearchShortcutKey(ctrlKEvent, { inputRef });
  assert.equal(handledCtrlK, true, 'Must handle Ctrl+K from inside input');
  assert.equal(ctrlKEvent.defaultPrevented, true, 'Must prevent default for Ctrl+K');
});

test('Keyboard: Escape closes the relevant open UI and restores focus to its trigger', () => {
  let isDrawerOpen = true;
  let triggerFocused = false;

  const mockTrigger = {
    focus() {
      triggerFocused = true;
    },
  };

  const onEscape = () => {
    isDrawerOpen = false;
    mockTrigger.focus();
  };

  const escapeEvent = createKeyEvent('Escape');
  const handled = handleSearchShortcutKey(escapeEvent, { onEscape });

  assert.equal(handled, true, 'Must handle Escape');
  assert.equal(escapeEvent.defaultPrevented, true, 'Must prevent default on Escape for active drawer');
  assert.equal(isDrawerOpen, false, 'Must close active drawer');
  assert.equal(triggerFocused, true, 'Must restore focus to trigger element');
});

test('Keyboard: Escape clears or blurs search input when focused without drawer', () => {
  const inputWithText = createMockInputElement('query text');
  inputWithText.focus();
  const inputRef1 = { current: inputWithText };

  // Set document.activeElement
  const prevDoc = globalThis.document;
  try {
    globalThis.document = { activeElement: inputWithText };

    // Escape with text: clears input and dispatches input event
    const escapeWithText = createKeyEvent('Escape', { target: inputWithText });
    const handled1 = handleSearchShortcutKey(escapeWithText, { inputRef: inputRef1 });
    assert.equal(handled1, true);
    assert.equal(escapeWithText.defaultPrevented, true);
    assert.equal(inputWithText.value, '', 'Must clear input value on Escape');
    assert.equal(inputWithText.dispatchedEvents.length, 1, 'Must dispatch input event');

    // Escape with empty text: blurs input
    const emptyInput = createMockInputElement('');
    emptyInput.focus();
    const inputRef2 = { current: emptyInput };
    globalThis.document = { activeElement: emptyInput };

    const escapeEmpty = createKeyEvent('Escape', { target: emptyInput });
    const handled2 = handleSearchShortcutKey(escapeEmpty, { inputRef: inputRef2 });
    assert.equal(handled2, true);
    assert.equal(emptyInput.isFocused, false, 'Must blur empty search input on Escape');
  } finally {
    globalThis.document = prevDoc;
  }
});

// ==============================================================================
// 2. Theme Service: Real Persistence & System Preference Tests
// ==============================================================================

test('Theme: explicit light and dark persistence across reload', () => {
  const mockStorage = createMockStorage(true);
  const mockDoc = createMockDocument('system');
  const prevWin = globalThis.window;
  const prevDoc = globalThis.document;

  try {
    globalThis.window = {
      localStorage: mockStorage,
      dispatchEvent: () => true,
      matchMedia: () => ({ matches: false }),
    };
    globalThis.document = mockDoc;

    // 1. Explicitly select dark
    setStoredTheme('dark');
    assert.equal(mockStorage.getItem(THEME_STORAGE_KEY), 'dark', 'Must persist dark in localStorage');
    assert.equal(getStoredTheme(), 'dark');
    assert.equal(resolveTheme('dark'), 'dark');
    assert.equal(mockDoc.documentElement.getAttribute('data-theme'), 'dark');
    assert.equal(mockDoc.documentElement.classList.contains('dark'), true);

    // 2. Simulate reload: new document with persisted storage
    const reloadedDoc = createMockDocument('dark');
    globalThis.document = reloadedDoc;
    const resolvedOnReload = applyTheme(getStoredTheme());
    assert.equal(resolvedOnReload, 'dark');
    assert.equal(reloadedDoc.documentElement.getAttribute('data-theme'), 'dark');
    assert.equal(reloadedDoc.documentElement.classList.contains('dark'), true);

    // 3. Explicitly select light
    setStoredTheme('light');
    assert.equal(mockStorage.getItem(THEME_STORAGE_KEY), 'light', 'Must persist light in localStorage');
    assert.equal(getStoredTheme(), 'light');
    assert.equal(resolveTheme('light'), 'light');
    assert.equal(reloadedDoc.documentElement.getAttribute('data-theme'), 'light');
    assert.equal(reloadedDoc.documentElement.classList.contains('dark'), false);
  } finally {
    globalThis.window = prevWin;
    globalThis.document = prevDoc;
    resetThemeMemory('system');
  }
});

test('Theme: "system" follows mocked light and dark prefers-color-scheme changes', () => {
  const mockStorage = createMockStorage(true);
  const mockDoc = createMockDocument('system');
  const mockMedia = createMockMatchMedia(false); // Initially light

  let changeEventDispatched = false;
  const prevWin = globalThis.window;
  const prevDoc = globalThis.document;

  try {
    globalThis.window = {
      localStorage: mockStorage,
      dispatchEvent(e) {
        if (e.detail === 'system' || e.type === THEME_CHANGE_EVENT) {
          changeEventDispatched = true;
        }
        return true;
      },
      matchMedia: () => mockMedia,
    };
    globalThis.document = mockDoc;

    // Set theme to system
    setStoredTheme('system');
    assert.equal(getStoredTheme(), 'system');
    assert.equal(getSystemTheme(), 'light');
    assert.equal(resolveTheme('system'), 'light');
    assert.equal(mockDoc.documentElement.classList.contains('dark'), false);

    // Setup active watcher
    const unwatch = watchSystemTheme(globalThis.window);

    // 1. Mock OS switching to Dark mode
    changeEventDispatched = false;
    mockMedia.setMatches(true);
    assert.equal(getSystemTheme(), 'dark');
    assert.equal(resolveTheme('system'), 'dark');
    assert.equal(mockDoc.documentElement.classList.contains('dark'), true, 'Must add dark class when OS switches to dark');
    assert.equal(changeEventDispatched, true, 'Must dispatch event to notify components');

    // 2. Mock OS switching back to Light mode
    changeEventDispatched = false;
    mockMedia.setMatches(false);
    assert.equal(getSystemTheme(), 'light');
    assert.equal(resolveTheme('system'), 'light');
    assert.equal(mockDoc.documentElement.classList.contains('dark'), false, 'Must remove dark class when OS switches to light');
    assert.equal(changeEventDispatched, true);

    unwatch();
  } finally {
    globalThis.window = prevWin;
    globalThis.document = prevDoc;
    resetThemeMemory('system');
  }
});

test('Theme: an explicit user choice overrides system changes', () => {
  const mockStorage = createMockStorage(true);
  const mockDoc = createMockDocument('light');
  const mockMedia = createMockMatchMedia(false);

  const prevWin = globalThis.window;
  const prevDoc = globalThis.document;

  try {
    globalThis.window = {
      localStorage: mockStorage,
      dispatchEvent: () => true,
      matchMedia: () => mockMedia,
    };
    globalThis.document = mockDoc;

    // User explicitly chose 'light'
    setStoredTheme('light');
    assert.equal(getStoredTheme(), 'light');
    assert.equal(mockDoc.documentElement.classList.contains('dark'), false);

    const unwatch = watchSystemTheme(globalThis.window);

    // OS changes to dark: explicit 'light' MUST remain 'light'
    mockMedia.setMatches(true);
    assert.equal(getStoredTheme(), 'light', 'Stored theme must remain explicit light');
    assert.equal(resolveTheme(getStoredTheme()), 'light', 'Resolved theme must remain light');
    assert.equal(mockDoc.documentElement.classList.contains('dark'), false, 'DOM must not add dark class');

    // User explicitly chose 'dark'
    setStoredTheme('dark');
    assert.equal(getStoredTheme(), 'dark');
    assert.equal(mockDoc.documentElement.classList.contains('dark'), true);

    // OS changes to light: explicit 'dark' MUST remain 'dark'
    mockMedia.setMatches(false);
    assert.equal(getStoredTheme(), 'dark', 'Stored theme must remain explicit dark');
    assert.equal(resolveTheme(getStoredTheme()), 'dark', 'Resolved theme must remain dark');
    assert.equal(mockDoc.documentElement.classList.contains('dark'), true, 'DOM must keep dark class');

    unwatch();
  } finally {
    globalThis.window = prevWin;
    globalThis.document = prevDoc;
    resetThemeMemory('system');
  }
});

test('Theme: storage-unavailable fallback operates seamlessly in memory', () => {
  // Simulate disabled/sandboxed localStorage that throws on access
  const throwingStorage = createMockStorage(false);
  const mockDoc = createMockDocument('system');

  const prevWin = globalThis.window;
  const prevDoc = globalThis.document;

  try {
    globalThis.window = {
      localStorage: throwingStorage,
      dispatchEvent: () => true,
      matchMedia: () => ({ matches: false }),
    };
    globalThis.document = mockDoc;
    resetThemeMemory('system');

    // Should gracefully fall back to in-memory store without throwing
    assert.equal(getStoredTheme(), 'system');

    setStoredTheme('dark');
    assert.equal(getStoredTheme(), 'dark', 'Must preserve in-memory dark choice');
    assert.equal(resolveTheme(getStoredTheme()), 'dark');
    assert.equal(mockDoc.documentElement.classList.contains('dark'), true);

    setStoredTheme('light');
    assert.equal(getStoredTheme(), 'light', 'Must preserve in-memory light choice');
    assert.equal(resolveTheme(getStoredTheme()), 'light');
    assert.equal(mockDoc.documentElement.classList.contains('dark'), false);
  } finally {
    globalThis.window = prevWin;
    globalThis.document = prevDoc;
    resetThemeMemory('system');
  }
});

// ==============================================================================
// 3. Toast Feedback System
// ==============================================================================

test('ToastSystem: adds, notifies subscribers, and dismisses notifications', () => {
  let observedToasts = [];
  const unsubscribe = subscribeToasts((t) => {
    observedToasts = t;
  });

  const id = showToast('Copied SVG markup!', 'success', 0);
  assert.ok(id, 'Must return a unique toast ID');
  assert.equal(observedToasts.length, 1);
  assert.equal(observedToasts[0].message, 'Copied SVG markup!');
  assert.equal(observedToasts[0].type, 'success');

  dismissToast(id);
  assert.equal(observedToasts.length, 0);

  unsubscribe();
});

test('ToastSystem: deduplicates identical rapid notifications within cooldown window', () => {
  const msg = 'Test Deduplication';
  const id1 = showToast(msg, 'success', 0);
  assert.ok(id1);

  // Immediate second call with identical message should be deduplicated
  const id2 = showToast(msg, 'success', 0);
  assert.equal(id2, null, 'Duplicate rapid toast must return null without adding to queue');

  // Dismiss created toast
  dismissToast(id1);
});

test('ToastSystem: bounds maximum concurrent toasts at 3 items', () => {
  const id1 = showToast('Message 1', 'info', 0);
  const id2 = showToast('Message 2', 'info', 0);
  const id3 = showToast('Message 3', 'info', 0);
  const id4 = showToast('Message 4', 'info', 0);

  const active = getToasts();
  assert.ok(active.length <= 3, 'Must bound active queue at maximum 3 toasts');

  // Clean up
  [id1, id2, id3, id4].forEach((id) => {
    if (id) dismissToast(id);
  });
});
