import React from 'react';
import { LayoutTemplate, Sparkles } from 'lucide-react';

const TEMPLATE_LIBRARY = {
  post: [
    { id: 'free', name: 'Libre', hint: 'Sin imponer estructura', previewFrame: 'clean' },
    { id: 'headline', name: 'Headline', hint: 'Titular arriba, foco visual fuerte', previewFrame: 'clean' },
    { id: 'footer', name: 'Footer', hint: 'Copy abajo, lectura rapida', previewFrame: 'card' },
    { id: 'product-focus', name: 'Producto', hint: 'Texto arriba y producto abajo', previewFrame: 'card' },
  ],
  story: [
    { id: 'free', name: 'Libre', hint: 'Composicion abierta', previewFrame: 'story' },
    { id: 'headline', name: 'Lead', hint: 'Mensaje principal arriba', previewFrame: 'story' },
    { id: 'centered', name: 'Centered', hint: 'Texto centrado con mas aire', previewFrame: 'story' },
    { id: 'footer', name: 'Footer', hint: 'Copy abajo dentro de safe zone', previewFrame: 'story' },
  ],
  reel: [
    { id: 'free', name: 'Libre', hint: 'Superposicion flexible', previewFrame: 'reel' },
    { id: 'headline', name: 'Hook', hint: 'Gancho arriba para primeros segundos', previewFrame: 'reel' },
    { id: 'centered', name: 'Centered', hint: 'Look mas limpio y inmersivo', previewFrame: 'reel' },
    { id: 'product-focus', name: 'Promo', hint: 'Copy arriba y CTA visual abajo', previewFrame: 'reel' },
  ],
};

function CompositionToolPanel({ contentType, compositionSettings, onApplyTemplate }) {
  const templates = TEMPLATE_LIBRARY[contentType] || TEMPLATE_LIBRARY.post;

  return (
    <div className="space-y-5 p-4">
      <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-stone-950 shadow-sm ring-1 ring-stone-200">
            <LayoutTemplate className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-950">Plantillas de composicion</h3>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Son presets sutiles. No intentan decorar demasiado: ayudan a que texto, producto y aire respiren mejor.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {templates.map((template) => {
            const isActive = compositionSettings.templateId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onApplyTemplate(template)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                  isActive ? 'border-stone-950 bg-white' : 'border-stone-100 bg-white hover:border-stone-200'
                }`}
              >
                <div className={`mt-0.5 h-10 w-10 rounded-xl ${
                  template.id === 'free'
                    ? 'bg-stone-100'
                    : template.id === 'headline'
                      ? 'bg-gradient-to-b from-stone-900 to-stone-600'
                      : template.id === 'footer'
                        ? 'bg-gradient-to-t from-stone-900 to-stone-200'
                        : template.id === 'centered'
                          ? 'bg-[radial-gradient(circle_at_center,_#1c1917,_#d6d3d1)]'
                          : 'bg-gradient-to-b from-amber-100 to-stone-900'
                }`} />
                <div>
                  <p className="text-sm font-semibold text-stone-950">{template.name}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{template.hint}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
          <Sparkles className="h-4 w-4" />
          Consejo
        </div>
        <p className="mt-2 text-xs leading-5 text-stone-500">
          Usa plantilla primero, luego afina con drag. Si todo queda demasiado centrado o pesado, vuelve a `Libre` y recoloca solo una capa principal.
        </p>
      </div>
    </div>
  );
}

export default CompositionToolPanel;
