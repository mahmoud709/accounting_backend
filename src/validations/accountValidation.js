const { z } = require('zod');

const moneyStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, 'المبلغ يجب أن يكون رقمًا موجبًا وبحد أقصى 4 أرقام عشرية')
  .refine((val) => parseFloat(val) > 0, 'المبلغ يجب أن يكون أكبر من صفر');

const nonNegativeMoneySchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, 'المبلغ يجب أن يكون رقمًا غير سالب وبحد أقصى 4 أرقام عشرية')
  .refine((val) => parseFloat(val) >= 0, 'المبلغ لا يمكن أن يكون سالبًا');

const contactDetailsSchema = z.object({
  phone: z.string().trim().optional().default(''),
  email: z.string().trim().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')).default(''),
  address: z.string().trim().optional().default(''),
});

const createAccountSchema = z.object({
  name: z.string().trim().min(2, 'اسم الحساب يجب ألا يقل عن حرفين').max(200, 'اسم الحساب لا يجب أن يتجاوز 200 حرف'),
  type: z.enum(['Contractor', 'Supplier', 'Engineer', 'Vault', 'Bank']),
  companyName: z.string().trim().max(200, 'اسم الشركة لا يجب أن يتجاوز 200 حرف').optional().default(''),
  accountNumber: z.string().trim().optional().default(''),
  contactDetails: contactDetailsSchema.optional().default({}),
  currentBalance: nonNegativeMoneySchema.optional().default('0.0000'),
  allowOverdraft: z.boolean().optional().default(false),
});

const lookupAccountSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'كود الحساب مطلوب')
    .transform((val) => val.toUpperCase()),
});

const listAccountsSchema = z.object({
  type: z.enum(['Contractor', 'Supplier', 'Engineer', 'Vault', 'Bank']).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int('رقم الصفحة يجب أن يكون عددًا صحيحًا').positive('رقم الصفحة يجب أن يكون أكبر من صفر').optional().default(1),
  limit: z.coerce.number().int('حد النتائج يجب أن يكون عددًا صحيحًا').min(1, 'حد النتائج يجب ألا يقل عن 1').max(100, 'حد النتائج لا يجب أن يتجاوز 100').optional().default(15),
});

module.exports = {
  createAccountSchema,
  lookupAccountSchema,
  listAccountsSchema,
  moneyStringSchema,
  nonNegativeMoneySchema,
};
