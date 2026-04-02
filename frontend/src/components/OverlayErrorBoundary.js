import React from 'react';
import FocusTrap from 'focus-trap-react';
import { AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Error boundary for overlay components (PostViewer, ProductDetailOverlay, RecipeOverlay).
 * Shows an inline error inside the overlay instead of crashing the full page.
 * Resets automatically when the `overlayKey` prop changes (i.e., a new item is selected).
 */
export default class OverlayErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.overlayKey !== this.props.overlayKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error, info) {
    console.error('[OverlayErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { onClose } = this.props;

    return (
      <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/75"
          onClick={onClose}
          aria-label="Cerrar"
        />
        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4 rounded-[28px] bg-white p-8 text-center shadow-xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:bg-stone-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-50">
            <AlertCircle className="h-7 w-7 text-stone-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-stone-950">{t('overlay_error_boundary.algoSalioMal', 'Algo salió mal')}</p>
            <p className="mt-1 text-sm text-stone-500">{t('overlay_error_boundary.noSePudoCargarEsteContenidoIntent', 'No se pudo cargar este contenido. Inténtalo de nuevo.')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 rounded-full bg-stone-950 px-6 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
          >
            Cerrar
          </button>
        </div>
      </div>
      </FocusTrap>
    );
  }
}
