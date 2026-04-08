import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        {(title || onClose) && (
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
            <h2 className="text-base font-semibold text-stone-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
