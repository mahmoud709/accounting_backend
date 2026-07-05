const { z } = require('zod');
const { moneyStringSchema } = require('./accountValidation');

const paymentDetailsSchema = z.object({
  checkNumber: z.string().trim().optional().default(''),
  bankName: z.string().trim().optional().default(''),
  transferReference: z.string().trim().optional().default(''),
  dueDate: z.coerce.date().optional().nullable(),
});

const createTransactionSchema = z
  .object({
    date: z.coerce.date().optional(),
    sourceAccount: z
      .string()
      .regex(/^[a-f\d]{24}$/i, 'معرف حساب المصدر غير صحيح')
      .optional()
      .nullable(),
    destinationAccount: z
      .string()
      .regex(/^[a-f\d]{24}$/i, 'معرف حساب الوجهة غير صحيح')
      .optional()
      .nullable(),
    amount: moneyStringSchema,
    paymentMethod: z.enum(['Cash', 'Bank_Transfer', 'Check']),
    paymentDetails: paymentDetailsSchema.optional().default({}),
    transactionType: z.enum(['Debit', 'Credit', 'Interest_Gain', 'Deposit', 'Withdrawal', 'Transfer']),
    description: z.string().trim().min(3, 'البيان يجب ألا يقل عن 3 أحرف').max(1000, 'البيان لا يجب أن يتجاوز 1000 حرف'),
    contactId: z.string().regex(/^[a-f\d]{24}$/i, 'معرف الجهة غير صحيح').optional().nullable(),
    allowOverdraft: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.transactionType === 'Interest_Gain' || data.transactionType === 'Deposit') {
      if (data.sourceAccount) {
        ctx.addIssue({
          code: 'custom',
          path: ['sourceAccount'],
          message: 'هذا القيد لا يجب أن يحتوي على حساب مصدر',
        });
      }
      if (!data.destinationAccount) {
        ctx.addIssue({
          code: 'custom',
          path: ['destinationAccount'],
          message: 'حساب الوجهة (البنك) مطلوب',
        });
      }
      return;
    }

    if (data.transactionType === 'Withdrawal') {
      if (data.destinationAccount) {
        ctx.addIssue({
          code: 'custom',
          path: ['destinationAccount'],
          message: 'قيد الصرف لا يجب أن يحتوي على حساب وجهة',
        });
      }
      if (!data.sourceAccount) {
        ctx.addIssue({
          code: 'custom',
          path: ['sourceAccount'],
          message: 'حساب المصدر (البنك) مطلوب',
        });
      }
      return;
    }

    if (!data.sourceAccount) {
      ctx.addIssue({
        code: 'custom',
        path: ['sourceAccount'],
        message: 'حساب المصدر مطلوب لهذا القيد',
      });
    }

    if (!data.destinationAccount) {
      ctx.addIssue({
        code: 'custom',
        path: ['destinationAccount'],
        message: 'حساب الوجهة مطلوب لهذا القيد',
      });
    }

    if (data.sourceAccount && data.sourceAccount === data.destinationAccount) {
      ctx.addIssue({
        code: 'custom',
        path: ['destinationAccount'],
        message: 'لا يمكن أن يكون حساب المصدر هو نفس حساب الوجهة',
      });
    }
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod !== 'Check') return;

    const checkNumber = data.paymentDetails?.checkNumber?.trim();
    const bankName = data.paymentDetails?.bankName?.trim();

    if (!checkNumber) {
      ctx.addIssue({
        code: 'custom',
        path: ['paymentDetails', 'checkNumber'],
        message: 'رقم الشيك مطلوب عند اختيار طريقة الدفع شيك',
      });
    } else if (!/^\d+$/.test(checkNumber)) {
      ctx.addIssue({
        code: 'custom',
        path: ['paymentDetails', 'checkNumber'],
        message: 'رقم الشيك يجب أن يكون أرقامًا فقط',
      });
    }

  })
const createInterestGainSchema = z.object({
  destinationAccount: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'معرف حساب البنك غير صحيح'),
  amount: moneyStringSchema,
  paymentMethod: z.enum(['Bank_Transfer']).optional().default('Bank_Transfer'),
  paymentDetails: paymentDetailsSchema.optional().default({}),
  description: z
    .string()
    .trim()
    .min(3, 'البيان يجب ألا يقل عن 3 أحرف')
    .max(1000, 'البيان لا يجب أن يتجاوز 1000 حرف'),
  date: z.coerce.date().optional(),
});

const createContraEntrySchema = z.object({
  originalTransactionId: z.string().trim().min(3, 'رقم القيد الأصلي مطلوب'),
  description: z
    .string()
    .trim()
    .min(3, 'البيان يجب ألا يقل عن 3 أحرف')
    .max(1000, 'البيان لا يجب أن يتجاوز 1000 حرف'),
  date: z.coerce.date().optional(),
});

module.exports = {
  createTransactionSchema,
  createInterestGainSchema,
  createContraEntrySchema,
  paymentDetailsSchema,
};
