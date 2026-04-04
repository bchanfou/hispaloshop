import { useState, useRef, useCallback, useEffect } from 'react';

const SNAP_THRESHOLD = 0.5; // fraction of screen width
const RETRACT_DELAY = 8000; // ms
const STRIP_WIDTH = 14; // px visible when retracted
const BUTTON_SIZE = 56; // px

function getStoredPosition() {
  try {
    const raw = localStorage.getItem('david_btn_pos');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storePosition(pos) {
  try {
    localStorage.setItem('david_btn_pos', JSON.stringify(pos));
  } catch {}
}

function getStoredSide() {
  try {
    return localStorage.getItem('david_btn_side') || 'right';
  } catch {
    return 'right';
  }
}

function storeSide(side) {
  try {
    localStorage.setItem('david_btn_side', side);
  } catch {}
}

/**
 * Manages the draggable, snap-to-edge, auto-retractable David AI button.
 *
 * States: 'button' | 'retracted' | 'chat'
 * - button: floating circle, draggable
 * - retracted: thin strip on the edge, tap → button, swipe → chat
 * - chat: full chat panel open
 */
export default function useDraggableButton() {
  const stored = getStoredPosition();
  const [side, setSide] = useState(getStoredSide); // 'left' | 'right'
  const [buttonY, setButtonY] = useState(stored?.y ?? null); // px from top
  const [phase, setPhase] = useState('button'); // 'button' | 'retracted' | 'chat'
  const [isDragging, setIsDragging] = useState(false);

  const retractTimerRef = useRef(null);
  const dragStartRef = useRef(null);
  const dragMovedRef = useRef(false);

  // Initialize Y on mount
  useEffect(() => {
    if (buttonY === null) {
      setButtonY(window.innerHeight - 160);
    }
  }, [buttonY]);

  // Auto-retract after RETRACT_DELAY when in 'button' phase
  const resetRetractTimer = useCallback(() => {
    if (retractTimerRef.current) clearTimeout(retractTimerRef.current);
    retractTimerRef.current = setTimeout(() => {
      setPhase((prev) => (prev === 'button' ? 'retracted' : prev));
    }, RETRACT_DELAY);
  }, []);

  useEffect(() => {
    if (phase === 'button') {
      resetRetractTimer();
    } else {
      if (retractTimerRef.current) clearTimeout(retractTimerRef.current);
    }
    return () => {
      if (retractTimerRef.current) clearTimeout(retractTimerRef.current);
    };
  }, [phase, resetRetractTimer]);

  // ── Drag handlers (pointer events for touch + mouse) ──

  const onDragStart = useCallback((e) => {
    // Only handle primary button / single touch
    if (e.button && e.button !== 0) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartRef.current = { x: clientX, y: clientY, startY: buttonY, startTime: Date.now() };
    dragMovedRef.current = false;
    setIsDragging(true);

    // Prevent text selection
    e.preventDefault();
  }, [buttonY]);

  const onDragMove = useCallback((e) => {
    if (!dragStartRef.current) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragMovedRef.current = true;
    }

    const newY = Math.max(40, Math.min(window.innerHeight - BUTTON_SIZE - 40, dragStartRef.current.startY + dy));
    setButtonY(newY);
  }, []);

  const onDragEnd = useCallback((e) => {
    if (!dragStartRef.current) return;
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;

    // Snap to nearest edge
    const screenW = window.innerWidth;
    const newSide = clientX < screenW * SNAP_THRESHOLD ? 'left' : 'right';
    setSide(newSide);
    storeSide(newSide);
    storePosition({ y: buttonY });

    dragStartRef.current = null;
    setIsDragging(false);
    resetRetractTimer();
  }, [buttonY, resetRetractTimer]);

  // Attach global move/end listeners when dragging
  useEffect(() => {
    if (!isDragging) return;
    const moveHandler = (e) => onDragMove(e);
    const endHandler = (e) => onDragEnd(e);
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', endHandler);
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('touchend', endHandler);
    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', endHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', endHandler);
    };
  }, [isDragging, onDragMove, onDragEnd]);

  // ── Actions ──

  const openChat = useCallback(() => {
    setPhase('chat');
  }, []);

  const closeChat = useCallback(() => {
    setPhase('button');
  }, []);

  /** Called from strip: tap shows button, swipe opens chat */
  const onStripInteract = useCallback((gesture) => {
    if (gesture === 'swipe') {
      setPhase('chat');
    } else {
      setPhase('button');
      resetRetractTimer();
    }
  }, [resetRetractTimer]);

  /** True if drag moved enough to suppress click */
  const wasDrag = useCallback(() => dragMovedRef.current, []);

  const handleButtonClick = useCallback(() => {
    if (!dragMovedRef.current) {
      openChat();
    }
  }, [openChat]);

  return {
    phase,
    side,
    buttonY: buttonY ?? window.innerHeight - 160,
    isDragging,
    STRIP_WIDTH,
    BUTTON_SIZE,
    onDragStart,
    handleButtonClick,
    openChat,
    closeChat,
    onStripInteract,
    wasDrag,
  };
}
