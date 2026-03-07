import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  name: z.string().min(2, 'Nombre mínimo 2 caracteres'),
  role: z.enum(['customer', 'producer', 'importer', 'influencer'], {
    errorMap: () => ({ message: 'Rol inválido' }),
  }),
  country: z.string().min(2, 'País requerido'),
  company_name: z.string().optional(),
});

// Product schemas
export const productSchema = z.object({
  name: z.string().min(3, 'Nombre mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  description: z.string().min(10, 'Descripción mínimo 10 caracteres').max(2000, 'Máximo 2000 caracteres'),
  price: z.number().positive('Precio debe ser positivo').max(10000, 'Precio máximo 10,000'),
  stock: z.number().int().min(0, 'Stock no puede ser negativo').max(10000, 'Stock máximo 10,000'),
  category_id: z.string().min(1, 'Categoría requerida'),
  country_origin: z.string().min(2, 'País de origen requerido'),
  ingredients: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  images: z.array(z.string().url('URL de imagen inválida')).min(1, 'Al menos una imagen requerida'),
});

// Para importers - campos adicionales
export const importedProductSchema = productSchema.extend({
  origin_country: z.string().min(2, 'País de origen requerido'),
  import_batch: z.string().optional(),
  import_date: z.string().optional(),
});

// Address schema
export const addressSchema = z.object({
  name: z.string().min(2, 'Nombre de dirección requerido'),
  street: z.string().min(5, 'Dirección completa requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  postal_code: z.string().min(3, 'Código postal requerido'),
  country: z.string().min(2, 'País requerido'),
  phone: z.string().optional(),
  is_default: z.boolean().optional(),
});

// Store profile schema
export const storeProfileSchema = z.object({
  name: z.string().min(3, 'Nombre mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  tagline: z.string().max(200, 'Máximo 200 caracteres').optional(),
  story: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
  location: z.string().min(2, 'Ubicación requerida'),
  contact_email: z.string().email('Email inválido').optional(),
  contact_phone: z.string().optional(),
});

// Discount code schema
export const discountCodeSchema = z.object({
  code: z.string().min(3, 'Código mínimo 3 caracteres').max(20, 'Máximo 20 caracteres'),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: z.number().min(0, 'Valor no puede ser negativo'),
  min_cart_amount: z.number().min(0).optional(),
  usage_limit: z.number().int().min(1).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

// Helper function to validate with Zod
export function validate(schema, data) {
  try {
    const result = schema.parse(data);
    return { success: true, data: result, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.reduce((acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {});
      return { success: false, data: null, errors };
    }
    throw error;
  }
}

// Helper to validate partial data (for updates)
export function validatePartial(schema, data) {
  return validate(schema.partial(), data);
}

export default {
  loginSchema,
  registerSchema,
  productSchema,
  importedProductSchema,
  addressSchema,
  storeProfileSchema,
  discountCodeSchema,
  validate,
  validatePartial,
};
