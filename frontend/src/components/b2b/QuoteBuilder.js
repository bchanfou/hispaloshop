import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, Send, Loader2 } from 'lucide-react';
import { useCreateInquiry } from '../../features/b2b/queries';
import { useTranslation } from 'react-i18next';

// ─── Schema ─────────────────────────────────────────────────────────────────
const rowSchema = z.object({
  product_id: z.string().min(1, 'ID de producto requerido'),
  qty_requested: z.coerce.number().int().min(1, t('quote_builder.minimo1Unidad', 'Mínimo 1 unidad')),
});

const quoteSchema = z.object({
  producer_id: z.string().min(1, 'ID del productor requerido'),
  target_country: z
    .string()
    .length(2, t('quote_builder.codigoDePaisDebeTener2Letras', 'Código de país debe tener 2 letras'))
    .transform((v) => v.toUpperCase()),
  message: z.string().min(10, t('quote_builder.elMensajeDebeTenerAlMenos10Caract', 'El mensaje debe tener al menos 10 caracteres')),
  rows: z.array(rowSchema).min(1, t('quote_builder.anadeAlMenosUnProducto', 'Añade al menos un producto')),
});

// ─── Field error helper ──────────────────────────────────────────────────────
function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-stone-700 mt-1">{message}</p>;
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function QuoteBuilder({ initialProducerId = '' }) {
  const createInquiry = useCreateInquiry();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      producer_id: initialProducerId,
      target_country: 'ES',
      message: '',
      rows: [{ product_id: '', qty_requested: 100 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'rows' });

  // Sync initialProducerId prop changes
  useEffect(() => {
    if (initialProducerId) setValue('producer_id', initialProducerId);
  }, [initialProducerId, setValue]);

  const onSubmit = async (data) => {
    const requestedLines = data.rows
      .map((row) => `- ${row.product_id}: ${row.qty_requested} uds`)
      .join('\n');

    try {
      const response = await createInquiry.mutateAsync({
        producerId: data.producer_id,
        productIds: data.rows.map((r) => r.product_id),
        message: `${data.message}\n\nProductos solicitados:\n${requestedLines}`,
        targetCountry: data.target_country,
      });
      toast.success(`RFQ enviada${response?.email_sent ? ' y notificada por email' : ''}.`);
      reset({
        producer_id: '',
        target_country: 'ES',
        message: '',
        rows: [{ product_id: '', qty_requested: 100 }],
      });
    } catch (error) {
      toast.error(error?.message || t('quote_builder.noSePudoEnviarLaRfq', 'No se pudo enviar la RFQ.'));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5"
    >
      <h3 className="font-semibold text-stone-950 text-base">{t('quote_builder.nuevaSolicitudDeCotizacionRfq', 'Nueva solicitud de cotización (RFQ)')}</h3>

      {/* Producer + Country */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">
            ID del Productor <span className="text-stone-600">*</span>
          </label>
          <input
            {...register('producer_id')}
            placeholder="prod_abc123"
            className={`w-full px-3 py-2 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 ${
              errors.producer_id ? 'border-stone-400' : 'border-stone-200'
            }`}
          />
          <FieldError message={errors.producer_id?.message} />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">
            País de destino <span className="text-stone-600">*</span>
          </label>
          <Controller
            control={control}
            name="target_country"
            render={({ field }) => (
              <select
                {...field}
                className={`w-full px-3 py-2 rounded-2xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-500 ${
                  errors.target_country ? 'border-stone-400' : 'border-stone-200'
                }`}
              >
                <option value="ES">🇪🇸 España</option>
                <option value="PT">🇵🇹 Portugal</option>
                <option value="FR">🇫🇷 Francia</option>
                <option value="DE">🇩🇪 Alemania</option>
                <option value="IT">🇮🇹 Italia</option>
                <option value="GB">🇬🇧 Reino Unido</option>
                <option value="US">🇺🇸 Estados Unidos</option>
                <option value="MX">🇲🇽 México</option>
                <option value="AR">🇦🇷 Argentina</option>
                <option value="CO">🇨🇴 Colombia</option>
                <option value="CL">🇨🇱 Chile</option>
                <option value="JP">🇯🇵 Japón</option>
                <option value="KR">🇰🇷 Corea</option>
              </select>
            )}
          />
          <FieldError message={errors.target_country?.message} />
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-stone-600 mb-1">
          Descripción del pedido <span className="text-stone-600">*</span>
        </label>
        <textarea
          {...register('message')}
          rows={4}
          placeholder={t('quote_builder.describeVolumenFormatosCertificacio', 'Describe volumen, formatos, certificaciones o requisitos logísticos.')}
          className={`w-full px-3 py-2 rounded-2xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-500 ${
            errors.message ? 'border-stone-400' : 'border-stone-200'
          }`}
        />
        <FieldError message={errors.message?.message} />
      </div>

      {/* Product rows */}
      <div>
        <label className="block text-sm font-medium text-stone-600 mb-2">
          Productos <span className="text-stone-600">*</span>
        </label>
        <div className="space-y-2">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <input
                  {...register(`rows.${idx}.product_id`)}
                  placeholder="ID del producto"
                  className={`w-full px-3 py-2 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 ${
                    errors.rows?.[idx]?.product_id ? 'border-stone-400' : 'border-stone-200'
                  }`}
                />
                <FieldError message={errors.rows?.[idx]?.product_id?.message} />
              </div>
              <div className="w-28 shrink-0">
                <input
                  {...register(`rows.${idx}.qty_requested`)}
                  type="number"
                  min="1"
                  placeholder="Cant."
                  className={`w-full px-3 py-2 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 ${
                    errors.rows?.[idx]?.qty_requested ? 'border-stone-400' : 'border-stone-200'
                  }`}
                />
                <FieldError message={errors.rows?.[idx]?.qty_requested?.message} />
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="mt-1 p-2 text-stone-600 hover:bg-stone-50 rounded-2xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {errors.rows?.root && <FieldError message={errors.rows.root.message} />}
        {errors.rows?.message && <FieldError message={errors.rows.message} />}

        <button
          type="button"
          onClick={() => append({ product_id: '', qty_requested: 100 })}
          className="mt-2 flex items-center gap-1.5 text-sm text-stone-950 font-medium hover:underline"
        >
          <Plus className="w-4 h-4" />
          Añadir producto
        </button>
      </div>

      {/* Submit */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting || createInquiry.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-stone-950 text-white rounded-2xl text-sm font-medium hover:bg-stone-800 disabled:opacity-60 transition-colors"
        >
          {isSubmitting || createInquiry.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isSubmitting || createInquiry.isPending ? 'Enviando...' : 'Enviar RFQ'}
        </button>
      </div>
    </form>
  );
}
