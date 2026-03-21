import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Email inv\u00e1lido'),
  password: z.string().min(1, 'Contrase\u00f1a requerida'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inv\u00e1lido'),
  password: z.string()
    .min(8, 'M\u00ednimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una may\u00fascula')
    .regex(/[0-9]/, 'Debe contener al menos un n\u00famero'),
  name: z.string().min(2, 'Nombre m\u00ednimo 2 caracteres'),
  role: z.enum(['customer', 'producer', 'importer', 'influencer'], {
    errorMap: () => ({ message: 'Rol inv\u00e1lido' }),
  }),
  country: z.string().min(2, 'Pa\u00eds requerido'),
  company_name: z.string().optional(),
});

// Product schemas
export const productSchema = z.object({
  name: z.string().min(3, 'Nombre m\u00ednimo 3 caracteres').max(100, 'M\u00e1ximo 100 caracteres'),
  description: z.string().min(10, 'Descripci\u00f3n m\u00ednimo 10 caracteres').max(2000, 'M\u00e1ximo 2000 caracteres'),
  price: z.number().positive('Precio debe ser positivo').max(10000, 'Precio m\u00e1ximo 10,000'),
  stock: z.number().int().min(0, 'Stock no puede ser negativo').max(10000, 'Stock m\u00e1ximo 10,000'),
  category_id: z.string().min(1, 'Categor\u00eda requerida'),
  country_origin: z.string().min(2, 'Pa\u00eds de origen requerido'),
  ingredients: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  images: z.array(z.string().url('URL de imagen inv\u00e1lida')).min(1, 'Al menos una imagen requerida'),
});

// Para importers - campos adicionales
export const importedProductSchema = productSchema.extend({
  origin_country: z.string().min(2, 'Pa\u00eds de origen requerido'),
  import_batch: z.string().optional(),
  import_date: z.string().optional(),
});

// Address schema
export const addressSchema = z.object({
  name: z.string().min(2, 'Nombre de direcci\u00f3n requerido'),
  street: z.string().min(5, 'Direcci\u00f3n completa requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  postal_code: z.string().min(3, 'C\u00f3digo postal requerido'),
  country: z.string().min(2, 'Pa\u00eds requerido'),
  phone: z.string().optional(),
  is_default: z.boolean().optional(),
});

// Store profile schema
export const storeProfileSchema = z.object({
  name: z.string().min(3, 'Nombre m\u00ednimo 3 caracteres').max(100, 'M\u00e1ximo 100 caracteres'),
  tagline: z.string().max(200, 'M\u00e1ximo 200 caracteres').optional(),
  story: z.string().max(2000, 'M\u00e1ximo 2000 caracteres').optional(),
  location: z.string().min(2, 'Ubicaci\u00f3n requerida'),
  contact_email: z.string().email('Email inv\u00e1lido').optional(),
  contact_phone: z.string().optional(),
});

// Discount code schema
export const discountCodeSchema = z.object({
  code: z.string().min(3, 'C\u00f3digo m\u00ednimo 3 caracteres').max(20, 'M\u00e1ximo 20 caracteres'),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: z.number().min(0, 'Valor no puede ser negativo'),
  min_cart_amount: z.number().min(0).optional(),
  usage_limit: z.number().int().min(1).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

// Inferred types from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ImportedProductInput = z.infer<typeof importedProductSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type StoreProfileInput = z.infer<typeof storeProfileSchema>;
export type DiscountCodeInput = z.infer<typeof discountCodeSchema>;

interface ValidationSuccess<T> {
  success: true;
  data: T;
  errors: null;
}

interface ValidationFailure {
  success: false;
  data: null;
  errors: Record<string, string>;
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// Helper function to validate with Zod
export function validate<T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.reduce<Record<string, string>>((acc, err) => {
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
export function validatePartial<T>(schema: z.ZodObject<any>, data: unknown): ValidationResult<Partial<T>> {
  return validate(schema.partial(), data) as ValidationResult<Partial<T>>;
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
