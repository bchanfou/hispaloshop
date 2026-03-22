// @ts-nocheck
import { useRef, useCallback } from 'react';

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  elementX: number;
  elementY: number;
}

interface UseEditorDragOptions {
  onDragStart?: (id: string) => void;
  onDragMove?: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
  onTrashZone?: (id: string) => void;
  trashZoneY?: number; // Y threshold for trash zone (% from top)
  containerRef?: React.RefObject<HTMLElement>;
}

export function useEditorDrag(options: UseEditorDragOptions = {}) {
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number>(0);
  const activeIdRef = useRef<string>('');

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string, initialX: number, initialY: number) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    activeIdRef.current = id;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      elementX: initialX,
      elementY: initialY,
    };
    options.onDragStart?.(id);
  }, [options]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current?.isDragging) return;
    dragRef.current.currentX = e.clientX;
    dragRef.current.currentY = e.clientY;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!dragRef.current) return;
      const container = options.containerRef?.current;
      const rect = container?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };

      const dx = dragRef.current.currentX - dragRef.current.startX;
      const dy = dragRef.current.currentY - dragRef.current.startY;
      const newX = Math.max(0, Math.min(100, dragRef.current.elementX + (dx / rect.width) * 100));
      const newY = Math.max(0, Math.min(100, dragRef.current.elementY + (dy / rect.height) * 100));

      options.onDragMove?.(activeIdRef.current, newX, newY);
    });
  }, [options]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current?.isDragging) return;
    cancelAnimationFrame(rafRef.current);

    const container = options.containerRef?.current;
    const rect = container?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };

    const dx = dragRef.current.currentX - dragRef.current.startX;
    const dy = dragRef.current.currentY - dragRef.current.startY;
    const finalX = Math.max(0, Math.min(100, dragRef.current.elementX + (dx / rect.width) * 100));
    const finalY = Math.max(0, Math.min(100, dragRef.current.elementY + (dy / rect.height) * 100));

    // Check trash zone
    if (options.trashZoneY && finalY > options.trashZoneY) {
      options.onTrashZone?.(activeIdRef.current);
    } else {
      options.onDragEnd?.(activeIdRef.current, finalX, finalY);
    }

    dragRef.current = null;
    activeIdRef.current = '';
  }, [options]);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
