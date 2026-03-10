import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function BottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  children,
  showHandle = true,
  maxHeight = '90vh'
}) {
  const sheetRef = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle swipe down to close
  useEffect(() => {
    if (!isOpen || !sheetRef.current) return;
    
    let startY = 0;
    let currentY = 0;
    
    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e) => {
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0) {
        sheetRef.current.style.transform = `translateY(${diff}px)`;
      }
    };
    
    const handleTouchEnd = () => {
      const diff = currentY - startY;
      if (diff > 100) {
        onClose();
      }
      sheetRef.current.style.transform = '';
      startY = 0;
      currentY = 0;
    };
    
    const sheet = sheetRef.current;
    sheet.addEventListener('touchstart', handleTouchStart);
    sheet.addEventListener('touchmove', handleTouchMove);
    sheet.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart);
      sheet.removeEventListener('touchmove', handleTouchMove);
      sheet.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="bottom-sheet-overlay"
        onClick={onClose}
        data-testid="bottom-sheet-overlay"
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="bottom-sheet"
        style={{ maxHeight }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
        data-testid="bottom-sheet"
      >
        {showHandle && <div className="bottom-sheet-handle" aria-hidden="true" />}

        {title && (
          <div className="flex items-center justify-between px-4 pb-4 border-b border-border-default">
            <h2 id="bottom-sheet-title" className="font-heading text-lg font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Cerrar"
              data-testid="bottom-sheet-close"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}
        
        <div className="overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - 80px)` }}>
          {children}
        </div>
      </div>
    </>
  );
}
