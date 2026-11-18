import { useEffect, useRef, RefObject } from 'react';

interface OverlayEntry {
  id: string;
  close: () => void;
}

const overlayStack: OverlayEntry[] = [];
let overlayCounter = 0;
let syntheticBackIgnoreCount = 0;
let lastOverlayPopTimestamp = 0;
const poppedIdsByBack = new Set<string>();
let globalListenersAttached = false;

function ensureGlobalListeners() {
  if (globalListenersAttached || typeof window === 'undefined') return;
  globalListenersAttached = true;

  // Run in capture phase so we intercept before React/FamilyContext route popstate listeners
  window.addEventListener(
    'popstate',
    () => {
      if (syntheticBackIgnoreCount > 0) {
        syntheticBackIgnoreCount--;
        lastOverlayPopTimestamp = Date.now();
        return;
      }

      if (overlayStack.length > 0) {
        const top = overlayStack.pop()!;
        poppedIdsByBack.add(top.id);
        lastOverlayPopTimestamp = Date.now();
        try {
          top.close();
        } catch (err) {
          console.warn('Overlay close on back error:', err);
        }
      }
    },
    true
  );

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && overlayStack.length > 0) {
      const top = overlayStack[overlayStack.length - 1];
      if (top) {
        e.stopPropagation();
        try {
          top.close();
        } catch {}
      }
    }
  });
}

if (typeof window !== 'undefined') {
  ensureGlobalListeners();
}

/**
 * Used by FamilyContext popstate listener so it never navigates away from the current page
 * when a back press only dismissed an overlay, modal, drawer, or chat tray.
 */
export function wasPopStateConsumedByOverlay(): boolean {
  if (syntheticBackIgnoreCount > 0) {
    return true;
  }
  if (Date.now() - lastOverlayPopTimestamp < 120) {
    return true;
  }
  return overlayStack.length > 0;
}

/**
 * Registers an open overlay/drawer/tray/panel with the global Back button & Escape key stack.
 * When the user presses mobile Back or browser Back, only the topmost open overlay closes,
 * maintaining draft text and current screen state smoothly.
 */
export function useBackButtonClose(
  isOpen: boolean,
  onClose: () => void,
  idPrefix = 'overlay'
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    ensureGlobalListeners();

    const id = `${idPrefix}-${++overlayCounter}`;
    const entry: OverlayEntry = {
      id,
      close: () => onCloseRef.current(),
    };

    overlayStack.push(entry);

    let pushedHistory = false;
    try {
      window.history.pushState(
        { ...(window.history.state || {}), __fhOverlay: id },
        '',
        window.location.href
      );
      pushedHistory = true;
    } catch {}

    return () => {
      // If dismissed by browser/hardware Back button, it was already popped
      if (poppedIdsByBack.has(id)) {
        poppedIdsByBack.delete(id);
        return;
      }

      const idx = overlayStack.findIndex((item) => item.id === id);
      const wasTop = idx === overlayStack.length - 1 && idx !== -1;
      if (idx !== -1) {
        overlayStack.splice(idx, 1);
      }

      // Clean up the synthetic history entry if this overlay was on top
      if (pushedHistory && wasTop) {
        try {
          if (window.history.state?.__fhOverlay === id) {
            syntheticBackIgnoreCount++;
            window.history.back();
          }
        } catch {}
      }
    };
  }, [isOpen, idPrefix]);
}

/**
 * Automatically closes popovers/trays/menus when clicking or tapping outside of the referenced element(s).
 */
export function useClickOutside(
  refs: RefObject<HTMLElement | null> | Array<RefObject<HTMLElement | null>>,
  isOpen: boolean,
  onClose: () => void
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const refsRef = useRef(refs);
  refsRef.current = refs;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const list = Array.isArray(refsRef.current) ? refsRef.current : [refsRef.current];
      const clickedInside = list.some((r) => r.current && r.current.contains(target));
      if (!clickedInside) {
        onCloseRef.current();
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, { capture: true, passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
    };
  }, [isOpen]);
}
